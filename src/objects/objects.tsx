class Point {
	x: number;
	y: number;

	static distance(p1, p2) {
		return ((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2) ** 0.5
	}

	constructor(params) {
		this.x = params.x;
		this.y = params.y;
	}

	move(target, distance) {
		const difference = Point.distance(this, target);
		this.x += (target.x - this.x)/difference * distance;
		this.y += (target.y - this.y)/difference * distance;
	}
}

class Process {
	currentParkgoers: Parkgoer[];
	currentDuration: number;
	duration: () => number;
	time: number;
	active: boolean;
	capacity: number;
	type: string; // 'group' (capacity = total groups) or 'person' (capacity = total people)
	record: {time: number, occupants: number, active: boolean, progress: number, currentDuration: number}[];

	constructor(params) {
		this.currentParkgoers = [];
		this.currentDuration = null;
		this.time = 0;
		this.active = false;
		this.capacity = params.capacity;
		this.record = [];
		this.type = params.type || "person";

		const duration = params.duration;
		if (typeof duration === "number") this.duration = () => duration;
		else this.duration = duration;
		if (typeof this.duration !== "function") throw "Invalid duration type";

		this.currentDuration = Math.round(this.duration());
	}

	empty() {
		return this.currentParkgoers.length === 0;
	}

	length() {
		if (this.type === "group") {
			return this.currentParkgoers.length;
		} else if (this.type === "person") {
			return this.currentParkgoers.reduce((total, parkgoer) => total + parkgoer.people, 0);
		}
	}

	peopleLength() {
		return this.currentParkgoers.reduce((total, parkgoer) => total + parkgoer.people, 0);
	}

	full(parkgoer?) {
		if (this.type === "group") {
			return this.length() === this.capacity;
		} else if (this.type === "person") {
			return this.length() + (parkgoer ? parkgoer.people : 0) > this.capacity;
		}
	}

	release() {
		this.currentParkgoers.forEach((parkgoer) => parkgoer.complete());
		this.currentParkgoers = [];
		this.time = 0;
		this.active = false;
	}

	seat(parkgoer) {
		if (this.full(parkgoer)) throw "Process will exceed capacity";
		this.currentParkgoers.push(parkgoer);
		parkgoer.state = "BUSY";
	}

	start() {
		if (this.empty()) throw "Process is empty";
		this.time = 1;
		this.currentDuration = Math.round(this.duration());
		this.active = true;
	}

	iterate() {
		if (this.active) {
			if (this.time < this.currentDuration) {
				this.time++;
			} else {
				this.release();
			}
		}
	}

	log(time) {
		this.record.push({
			time: time,
			occupants: this.length(),
			active: this.active,
			progress: this.time,
			currentDuration: this.currentDuration,
		});
	}
}

class Queue {
	queue: Parkgoer[];
	privileges: Set<string>;
	display: {parent: Point, offset: Point, angle: number, spacing: number};
	record: {time: number, length: number}[];
	statistics: {waitTimes: number[]} = {waitTimes: []};
	current: Record<number, number> = {};

	constructor(params, parent) {
		const angleToPosition = (angle) => ({
			x: Math.sin(angle * Math.PI / 180) * 0.025,
			y: -Math.cos(angle * Math.PI / 180) * 0.025,
		});
		this.queue = [];
		this.display = params.display ? {
			parent: parent.position,
			offset: new Point("angle" in params.display.offset ? angleToPosition(params.display.offset.angle) : params.display.offset),
			angle: params.display.angle,
			spacing: params.display.spacing,
		} : null;
		this.privileges = new Set(params.privileges || []);
		this.record = [];
	}

	position(index) {
		const display = this.display;
		return new Point({
			x: display.parent.x + display.offset.x + index * display.spacing * Math.sin(display.angle * Math.PI / 180),
			y: display.parent.y + display.offset.y + index * display.spacing * -Math.cos(display.angle * Math.PI / 180),
		});
	}

	push(parkgoer) {
		this.queue.push(parkgoer);
		this.current[parkgoer.id] = this.record[this.record.length - 1].time;
		if (this.display) {
			parkgoer.position = this.position(this.queue.length);
		} else {
			parkgoer.position = null;
		}
	}

	peek() {
		if (!this.length()) return null;
		return this.queue[0];
	}

	pop() {
		if (!this.length()) return null;
		if (this.display) {
			this.queue.forEach((parkgoer, ind) => {
				parkgoer.position = this.position(ind + 1);
			});
		}
		const parkgoer = this.queue.splice(0, 1)[0];
		parkgoer.position = null;
		for (let i=0; i<parkgoer.people; i++) {
			this.statistics.waitTimes.push(this.record[this.record.length - 1].time - this.current[parkgoer.id]);
		}
		delete this.current[parkgoer.id];
		return parkgoer;
	}

	length() {
		return this.queue.reduce((total, parkgoer) => total + parkgoer.people, 0);
	}

	log(time) {
		this.record.push({
			time: time,
			length: this.length(),
		});
	}
}

class Activity {
	label: string;
	icon: string;
	position: Point;
	processes: Process[];
	queues: Queue[];
	consumer: Generator<Queue[], Queue, Process>;
	consumerFunction: (Process) => void;
	assigner: (queues: Queue[], parkgoer: Parkgoer) => Queue;
	popularity: number;
	relativeProcesses: {window: number, index: number};
	statistics: {parkgoers: number} = {parkgoers: 0};

	static activities = [];
	static stations = {before: [], after: []};
	static shortestQueueAssigner = function(queues, parkgoer) {
		const minInd = queues.reduce((minInd, elm, ind, arr) => (elm.length() < arr[minInd].length() ? ind : minInd), 0);
		return queues[minInd];
	};
	static privilegedAssigner = function(queues, parkgoer) {
		// check if parkgoer's privileges match with any of queue's privileges, or queue has no privileges
		const assignableQueues = queues.filter((queue) => {
			if (queue.privileges.size === 0) return true;
			for (const privilege of queue.privileges.keys()) {
				if (parkgoer.privileges.has(privilege)) return true;
			}
			return false;
		});
		if (!assignableQueues.length) throw "No assignable queues available"
		return Activity.shortestQueueAssigner(assignableQueues, parkgoer);
	};
	static longestQueueConsumer = function*(queues) {
		let sortedQueues, flag;
		let proc = yield null;
		while (true) {
			flag = false;
			sortedQueues = queues.sort((a, b) => b.length() - a.length());
			for (const queue of sortedQueues) {
				if (!proc.full(queue.peek())) {
					flag = true;
					proc = yield queue;
					break;
				}
			}
			if (!flag) proc = yield null;
		}
	};
	static turnBasedConsumer = function*(queues) {
		let index = 0;
		let proc = yield null;
		while (true) {
			if (queues[index].peek() && !proc.full(queues[index].peek())) {
				proc = yield queues[index];
			} else if (queues.filter((queue) => queue.peek() ? !proc.full(queue.peek()) : false).length === 0) {
				// Process does not have space for any of the queues
				proc = yield null;
			}
			index = index < queues.length - 1 ? index + 1 : 0;
		}
	};
	static Assigners = {
		shortestQueue: Activity.privilegedAssigner,
	};
	static Consumers = {
		longestQueue: Activity.longestQueueConsumer,
		turnBased: Activity.turnBasedConsumer,
	};
	static all = function() {
		return [
			...Activity.stations.before,
			...Activity.activities,
			...Activity.stations.after,
		];
	};

	constructor(params) {
		const angleToPosition = (angle) => ({
			x: 0.5 + Math.sin(angle * Math.PI / 180) * 0.4,
			y: 0.5 - Math.cos(angle * Math.PI / 180) * 0.4,
		});
		this.label = params.label;
		this.position = new Point("angle" in params.position ? angleToPosition(params.position.angle) : params.position);
		this.icon = params.icon;
		this.processes = params.processes.map((param) => {
			if (param.durationRange) {
				const duration = () => param.duration + param.durationRange * (2 * Math.random() - 1);
				return new Process({...param, duration: duration});
			}
			return new Process(param);
		});
		this.queues = params.queues.map((param) => new Queue(param, this));
		this.popularity = params.popularity || 1;
		this.relativeProcesses = params.relativeProcesses ? {
			window: Math.ceil(Math.pow(this.processes.length, 2) / params.processes.reduce((total, param) => total + param.duration, 0)),
			index: 0,
		} : null;

		if (!this.processes.length) throw "At least one process is required";
		if (!this.queues.length) throw "At least one queue is required";

		// consumer is a generator function that returns the queue to draw from
		if (params.consumer) {
			if (params.consumer in Activity.Consumers) this.consumer = Activity.Consumers[params.consumer](this.queues);
		} else {
			this.consumer = Activity.turnBasedConsumer(this.queues);
		}
		if (this.consumer) {
			this.consumer.next(); // initialize
			this.consumerFunction = (proc) => {
				while (!proc.full()) {
					const queue = this.consumer.next(proc).value;
					if (!queue) break;
					const parkgoer = queue.pop();
					proc.seat(parkgoer);
				}
				if (!proc.empty()) proc.start();
			};
		} else {
			// custom function which cannot be implemented with generator
			// assume that we have single rider queues, normal queues, and priority queues
			this.consumerFunction = (proc) => {
				const priorityQueues = this.queues.filter((queue) => queue.privileges.has("priority"));
				const normalQueues = this.queues.filter((queue) => !queue.privileges.size);
				const singleQueues = this.queues.filter((queue) => queue.privileges.has("single"));
				const priorityRatio = 0.5;
				const fillFrom = (queueSet) => {
					const queues = queueSet.filter((queue) => queue.peek() ? !proc.full(queue.peek()) : false);
					if (!queues.length) return false;
					const parkgoer = queues[0].pop();
					proc.seat(parkgoer);
					return true;
				};
				// take groups from priority until >= 50% of capacity filled
				while (proc.length() < priorityRatio * proc.capacity) {
					if (!fillFrom(priorityQueues)) break;
				}
				while (!proc.full()) {
					if (!fillFrom(normalQueues)) break;
				}
				while (!proc.full()) {
					if (!fillFrom(singleQueues)) break;
				}
				if (!proc.empty()) proc.start();
			};
		}

		// assigner is a function that takes in parkgoer and queues that returns the queue to add to
		if (params.assigner) this.assigner = Activity.Assigners[params.assigner];
		else this.assigner = Activity.privilegedAssigner;

		switch (params.station) {
			case "before":
				Activity.stations.before.push(this);
				break;
			case "after":
				Activity.stations.after.push(this);
				break;
			default:
				Activity.activities.push(this);
				break;
		}
	}

	assign(parkgoer) {
		// Register a parkgoer with this activity
		parkgoer.state = "WAIT";
		const queue = this.assigner(this.queues, parkgoer);
		queue.push(parkgoer);
		this.statistics.parkgoers += parkgoer.people;
	}

	peekLength(parkgoer) {
		return this.assigner(this.queues, parkgoer).length();
	}

	visible() {
		return true;
	}

	iterate() {
		// Iterate processes
		this.processes.forEach((proc) => proc.iterate());

		// Acquire waiting parkgoers from queue into idle processes
		// For relative processes, only do this for relevant window of processes
		let processes;
		if (this.relativeProcesses) {
			processes = this.processes
				.slice(this.relativeProcesses.index, this.relativeProcesses.index + this.relativeProcesses.window)
				.filter((proc, ind) => !proc.active);
			this.relativeProcesses.index += this.relativeProcesses.window;
			this.relativeProcesses.index %= this.processes.length;
		} else {
			processes = this.processes.filter((proc) => !proc.active);
		}
		processes.forEach(this.consumerFunction);
	}

	retrieve() {
		return {
			label: this.label,
			icon: this.icon,
			statistics: this.statistics,
			processes: this.processes.map((proc) => ({
				capacity: proc.capacity,
				record: proc.record,
			})),
			queues: this.queues.map((queue) => ({
				privileges: Array.from(queue.privileges),
				statistics: {
					meanWaitTime: queue.statistics.waitTimes.reduce((sum, elm) => sum + elm)/queue.statistics.waitTimes.length,
				},
				record: queue.record,
			})),
		};
	}

	log(time) {
		this.processes.forEach((proc) => proc.log(time));
		this.queues.forEach((queue) => queue.log(time))
	}
}

class Parkgoer {
	id: number;
	state: string;
	position: Point;
	privileges: Set<string>;
	itinerary: {rides: Activity[], stations: {before: Activity[], after: Activity[]}};
	movespeed: number;
	people: number;
	nextTarget: Activity;
	record: {time: number, state: string, next: string}[];

	static parkgoers: Parkgoer[] = [];
	static exited: Parkgoer[] = [];
	static movespeed: number;
	static speedrange: number;
	static index = 0;
	static all = function() {
		return Parkgoer.parkgoers;
	};

	constructor(params) {
		this.id = Parkgoer.index;
		Parkgoer.index++;
		this.state = "FREE";
		this.position = new Point(params.position || {x: 0, y: 0})
		this.people = params.people;
		const privileges = params.privileges || [];
		if (params.people === 1) privileges.push("single");
		this.privileges = new Set(privileges);
		this.itinerary = params.itinerary;
		this.nextTarget = this.getNextTarget();
		this.movespeed = params.movespeed;
		this.record = []
		Parkgoer.parkgoers.push(this);
	}

	move() {
		// returns whether the agent has arrived at the target
		const target = this.next();
		if (Point.distance(this.position, target.position) <= (Parkgoer.movespeed + Parkgoer.speedrange)) return true;
		this.position.move(target.position, Parkgoer.movespeed + Parkgoer.speedrange * (2 * Math.random() - 1));
		return false;
	}

	getNextTarget() {
		if (this.nextTarget) {
			if (this.itinerary.stations.before.indexOf(this.nextTarget) !== -1) {
				this.itinerary.stations.before.splice(this.itinerary.stations.before.indexOf(this.nextTarget), 1);
			} else if (this.itinerary.rides.indexOf(this.nextTarget) !== -1) {
				this.itinerary.rides.splice(this.itinerary.rides.indexOf(this.nextTarget), 1);
			} else if (this.itinerary.stations.after.indexOf(this.nextTarget) !== -1) {
				this.itinerary.stations.after.splice(this.itinerary.rides.indexOf(this.nextTarget), 1);
			}
		}
		if (this.itinerary.stations.before.length) {
			return this.itinerary.stations.before[0];
		} else if (this.itinerary.rides.length) {
			return this.itinerary.rides.reduce((current, ride) => ride.peekLength(this) < current.peekLength(this) ? ride : current);
		} else if (this.itinerary.stations.after.length) {
			return this.itinerary.stations.after[0];
		} else {
			return null;
		}
	}

	next() {
		return this.nextTarget;
	}

	complete() {
		const position = this.next().position;
		this.position = new Point({x: position.x, y: position.y});
		this.state = "FREE";
		this.nextTarget = this.getNextTarget();
	}

	visible() {
		return this.position !== null;
	}

	iterate() {
		if (!this.next()) {
			// done, exit park
			this.destroy();
			return;
		}
		switch (this.state) {
			case "FREE":
				if (this.move()) {
					this.next().assign(this);
				}
				break;
			case "WAIT":
				break;
			case "BUSY":
				break;
			default:
				throw "Invalid Parkgoer state"
		}
	}

	log(time) {
		this.record.push({
			time: time,
			state: this.state,
			next: this.next() ? this.next().label : null,
		});
	}

	retrieve() {
		return {
			id: this.id,
			privileges: Array.from(this.privileges),
			people: this.people,
			record: this.record,
			statistics: {
				free: this.record.filter((rec) => rec.state === "FREE").length/this.record.length,
				busy: this.record.filter((rec) => rec.state === "BUSY").length/this.record.length,
				wait: this.record.filter((rec) => rec.state === "WAIT").length/this.record.length,
			}
		};
	}

	destroy() {
		const index = Parkgoer.parkgoers.indexOf(this);
		if (index > -1) Parkgoer.parkgoers.splice(index, 1);
		Parkgoer.exited.push(this);
	}
}

function reduceByKey(array, key, reducer=null) {
	const result = {};
	array.forEach((elm) => {
		const k = key(elm);
		if (!k) return;
		if (k in result) result[k].push(elm);
		else result[k] = [elm];
	});
	if (reducer) Object.keys(result).forEach((k) => result[k] = reducer(result[k]));
	return result;
}

function getRecords() {
	const retrieve = (obj) => obj.retrieve();
	const parkgoers = [...Parkgoer.parkgoers.map(retrieve), ...Parkgoer.exited.map(retrieve)];
	const passTypes = reduceByKey(parkgoers, (parkgoer) => parkgoer.privileges.sort().join(", "), (key) => key.reduce((total, elm) => total + elm.people, 0));
	// const queueTimes = parkgoers.map((parkgoer) => reduceByKey(parkgoer.record, (record) => record.next, (key) => key.filter((rec) => rec.state === "WAIT").length));
	// const activityLabels = Activity.all().map((activity) => activity.label);
	// const averageQueueTimes = {};
	// activityLabels.forEach((label) => {
	// 	const queueTime = queueTimes.filter((timeSet) => label in timeSet);
	// 	averageQueueTimes[label] = queueTime.reduce((sum, elm) => sum + elm[label], 0)/queueTime.length;
	// });
	const data = {
		statistics: {
			parkgoers: {
				total: parkgoers.reduce((total, elm) => total + elm.people, 0),
				...passTypes
			}
		},
		parkgoers: parkgoers,
		activities: {
			rides: Activity.activities.map(retrieve),
			stations: {
				before: Activity.stations.before.map(retrieve),
				after: Activity.stations.after.map(retrieve),
			},
		},
	};
	return data;
}

function exportCSV(records=null) {
	records = records || getRecords();
	const parkgoers = records.parkgoers;
	const activityLabels = Activity.all().map((activity) => activity.label)
	const activityHeaders = activityLabels.reduce((acc, elm) => [...acc, `${elm}_queue`, `${elm}_busy`], []);
	const headers = ["id", "privileges", "people", ...activityHeaders, "prop.free", "prop.busy", "prop.wait"]
	const data = [headers, ...parkgoers.sort((a, b) => a.id - b.id).map((parkgoer) => [
			parkgoer.id,
			parkgoer.privileges.sort().join(", "),
			parkgoer.people,
			...activityLabels.map((label) => [
				parkgoer.record.filter((record) => record.next === label && record.state === "WAIT").length,
				parkgoer.record.filter((record) => record.next === label && record.state === "BUSY").length,
			]).reduce((acc, elm) => [...acc, ...elm], []),
			parkgoer.statistics.free,
			parkgoer.statistics.busy,
			parkgoer.statistics.wait,
	])];
	const csv = data.map((row) => row.map((elm) => `"${elm}"`).join(",")).join("\n");
	const link = document.createElement("a");
	link.download = "record.csv";
	link.href = URL.createObjectURL(new Blob([csv], {type: "text/csv"}));
	link.click();
}

function exportJSON(records=null, name="record.json") {
	const data = JSON.stringify(records || getRecords(), null, "\t");
	const link = document.createElement("a");
	link.download = name;
	link.href = URL.createObjectURL(new Blob([data], {type: "text/json"}));
	link.click();
}

function iterate(time) {
	Parkgoer.all().forEach((parkgoer) => {
		parkgoer.iterate();
	});
	Activity.all().forEach((activity) => {
		activity.iterate();
	});
	Parkgoer.all().forEach((parkgoer) => {
		parkgoer.log(time);
	});
	Activity.all().forEach((activity) => {
		activity.log(time);
	});
}

export {
	Point,
	Process,
	Queue,
	Activity,
	Parkgoer,
	iterate,
	getRecords,
	exportCSV,
	exportJSON,
};