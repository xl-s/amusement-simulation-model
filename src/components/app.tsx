import React, { useState, useEffect } from "react";
import useInterval from "react-useinterval";
import random from "random";
import { Process, Queue, Activity, Parkgoer, iterate, exportRecords } from "../objects/objects";
import { FaUser, FaFlag, FaUsers, FaUserFriends, FaRegPlayCircle, FaRegPauseCircle } from "react-icons/fa";
import { PlayCircleOutlined, PauseCircleOutlined } from "@ant-design/icons";
import { Button, Row, Col, List, Tooltip, Collapse, Switch, Space, Slider, Typography, Statistic, Card, Upload } from "antd";
import Specification from "../../data/setup.json";
import grassTile from "../images/grass.png";
import ActivityIcons from "./icons";


const { Text, Title } = Typography;

function shuffle(arr) {
	return arr.map((elm) => ({sort: random.float(), value: elm})).sort((a, b) => a.sort - b.sort).map((elm) => elm.value);
}

function arrayOf(of, length) {
	return Array.from(Array(length).keys()).map(of);
}

function parseTime(minutes) {
	const hour = 9 + Math.floor(minutes / 60);
	const minute = String(minutes % 60).padStart(2, "0");
	return `${(hour - 1) % 12 + 1}:${minute} ${hour % 24 >= 12 ? "pm" : "am"}`;
}

function parkgoerRate(polynomial, time) {
	const parameter = Math.round(polynomial.reduce((total, term, exponent) => total + term * Math.pow(time, exponent), 0));
	if (parameter <= 0) return 0;
	return random.poisson(parameter)()
}

function getPrivilege(privileges): string[] {
	const rand = random.float();
	let accum = 0;
	for (const privilege of privileges) {
		accum += privilege.probability;
		if (rand < accum) {
			if (privilege.privilege) {
				return [privilege.privilege];
			} else {
				return [];
			}
		}
	}
	return [];
}

function getPeople(groupsize): number {
	const rand = random.float();
	let accum = 0;
	for (const group of groupsize) {
		accum += group.probability;
		if (rand < accum) return group.size;
	}
	return 1;
}

function getItinerary(): { rides: Activity[], stations: {before: Activity[], after: Activity[]} } {
	let rides = [];
	while (!rides.length) {
		rides = shuffle(Activity.activities).filter((ride) => random.float() < ride.popularity);
	}
	return {
		stations: {
			before: [...Activity.stations.before],
			after: [...Activity.stations.after],
		},
		rides: rides
	}
}

const ParkgoerComponent = ({ parkgoer, width, height }: { parkgoer: Parkgoer, width: number, height: number }): React.FC => {
	if (!parkgoer.visible()) return null;
	let Icon;
	if (parkgoer.people === 1) {
		Icon = FaUser;
	} else if (parkgoer.people === 2) {
		Icon = FaUserFriends;
	} else {
		Icon = FaUsers;
	}
	return (
		<Icon fontSize={parkgoer.people === 1 ? 12 : 15} style={{color: parkgoer.state === "FREE" ? "#75A1D6" : "#FB6542", position: "absolute", top: parkgoer.position.y * height, left: parkgoer.position.x * width}} />
	);
};

const ActivityComponent = ({ activity, width, height }: { activity: Activity, width: number, height: number }): React.FC => {
	if (!activity.visible()) return null;
	const side = Math.min(width, height)/15;
	return (
		<Tooltip 
			title={
				<div>
					<Space direction="vertical" size={1}>
					<Text style={{fontSize: 18, color: "white"}}>{activity.label}</Text>
					<Text style={{color: "white"}}>{activity.queues.length} queue{activity.queues.length === 1 ? "" : "s"}</Text>
					<Text style={{color: "white"}}>{activity.processes.length} process{activity.processes.length === 1 ? "" : "es"}</Text>
					</Space>
				</div>
			}
			mouseEnterDelay={0}
			mouseLeaveDelay={0}
		>
		<img src={ActivityIcons[activity.icon]} style={{position: "absolute", height: side, width: side, top: activity.position.y * height, left: activity.position.x * width, transform: "translate(-50%, -50%)"}} />
		</Tooltip>
	);
};

const Canvas = ({ time, width, height }): React.FC => {
	return (
		<div style={{margin: "0 auto", position: "relative", width: width, height: height, borderStyle: "ridge", backgroundImage: `url(${grassTile}`}}>
			{Activity.all().map((activity, ind) => (
				<ActivityComponent key={ind} activity={activity} width={width} height={height} />
			))}
			{Parkgoer.all().map((parkgoer, ind) => (
				<ParkgoerComponent key={ind} parkgoer={parkgoer} width={width} height={height} />
			))}
		</div>
	);
};

const ActivityPane = (): React.FC => {
	return (
		<List
			style={{width: "100%", height: "100%", maxWidth: "25vw", maxHeight: "100vh", overflow: "auto"}}
			itemLayout="vertical"
			dataSource={Activity.all()}
			renderItem={(activity) => {
				const totalQueue = activity.queues.reduce((sum, queue) => sum + queue.length(), 0);
				const totalProcess = activity.processes.reduce((sum, proc) => sum + proc.peopleLength(), 0);
				const totalParkgoers = totalQueue + totalProcess;
				return (<List.Item>
					<List.Item.Meta
						avatar={<img src={ActivityIcons[activity.icon]} style={{width: 20, height: 20}} />}
						title={activity.label}
						description={`${totalQueue} in queue • ${totalProcess} in process • ${totalParkgoers} total`}
					/>
					<Collapse>
						<Collapse.Panel key="queues" header="Queues">
						<List
							style={{marginTop: -18, marginBottom: -24}}
							dataSource={activity.queues}
							renderItem={(queue: Queue) => (
								<List.Item>
									<List.Item.Meta
										avatar={<FaUsers style={{transform: "translateY(3px)"}} />}
										title={`${queue.length()} in queue`}
										description={`Privileges: ${queue.privileges.size ? Array.from(queue.privileges).join(", ") : "None"}`}
									/>
								</List.Item>
							)}
						/>
						</Collapse.Panel>
						<Collapse.Panel key="processes" header="Processes">
						<List
							style={{marginTop: -18, marginBottom: -24}}
							dataSource={activity.processes}
							renderItem={(proc: Process) => (
								<List.Item>
									<List.Item.Meta
										avatar={proc.active ? <FaRegPlayCircle style={{transform: "translateY(3px)"}} /> : <FaRegPauseCircle style={{transform: "translateY(3px)"}} />}
										title={proc.active ? "Active" : "Inactive"}
										description={`Capacity: ${proc.length()}/${proc.capacity}${proc.type === "group" ? ` group${proc.capacity !== 1 ? "s" : ""}` : ""} • Duration: ${proc.time}/${proc.currentDuration}`}
									/>
								</List.Item>
							)}
						/>
						</Collapse.Panel>
					</Collapse>
				</List.Item>);
			}}
		/>
	);
};

const App = (): React.FC => {
	const [time, setTime] = useState<number>(0);
	const [ready, setReady] = useState<boolean>(false);
	const [delay, setDelay] = useState<number>(100);
	const [duration, setDuration] = useState<number>(null);
	const [rate, setRate] = useState<number>(null);
	const [privileges, setPrivileges] = useState<{privilege: string, probability: number}[]>(null);
	const [entries, setEntries] = useState<number[]>(null);
	const [groupsize, setGroupsize] = useState<{size: number, probability: number}>(null);
	const [simulation, setSimulation] = useState<boolean>(false);
	const [width, setWidth] = useState<number>(null);
	const [height, setHeight] = useState<number>(null);

	const loadSim = (specification) => {
		// probably be good to do some kind of validation
		setRate(specification.parkgoers.rate);
		setDuration(specification.simulation.duration);
		setPrivileges(specification.parkgoers.privileges);
		setGroupsize(specification.parkgoers.groupsize);
		const polynomial = specification.parkgoers.rate.polynomial;
		setEntries(arrayOf((time) => parkgoerRate(polynomial, time), specification.simulation.duration) as number[]);
		Parkgoer.movespeed = specification.parkgoers.movespeed;
		Parkgoer.speedrange = specification.parkgoers.speedrange;
		specification.activities.forEach((activity) => {
			new Activity(activity);
		});
		setTime(1);
		setReady(true);
	};
	const reset = () => {
		setSimulation(false);
		setReady(false);
		setTime(0);
		Parkgoer.parkgoers = [];
		Parkgoer.exited = [];
		Activity.stations.before = [];
		Activity.stations.after = [];
		Activity.activities = [];
	};
	const resizeWindow = () => {
		setWidth(window.innerWidth);
		setHeight(window.innerHeight);
	};

	useInterval(() => {
		if (Parkgoer.all().length === 0 && time > duration) {
			// TODO simulation done, display end screen
			setSimulation(false);
			exportRecords();
		}
		const entrants = entries[time];
		let total = 0;
		while (total < entrants) {
			const people = getPeople(groupsize);
			total += people;
			new Parkgoer({itinerary: getItinerary(), people: people, privileges: getPrivilege(privileges)});
		}
		iterate(time);
		setTime(time + 1);
	}, simulation ? delay : null);
	useEffect(() => {
		resizeWindow();
		window.addEventListener("resize", resizeWindow);
		return () => window.removeEventListener("resize", resizeWindow);
	}, []);

	return (
		<Row style={{height: "100vh"}} align="middle">
			<Col xs={12}>
				<Canvas time={time} width={width * 0.5 * 0.9} height={height * 0.9} />
			</Col>
			<Col xs={12}>
				<Row style={{height: "100vh"}} align="middle">
				<Col xs={12}>
					<Button type="primary" size="large" style={{width: "90%", height: 60, fontSize: 30}} disabled={!ready} onClick={() => setSimulation(!simulation)}>{simulation ? <PauseCircleOutlined /> : <PlayCircleOutlined />}</Button>
					<br />
					<br />
					<Text>Simulation Speed</Text><Slider style={{width: "90%"}} tipFormatter={(val) => `${val} iterations / s`} defaultValue={10} min={1} max={30} onChange={(itps) => setDelay(1000/itps)} />
					<br />
					<Row style={{width: "90%"}}>
					<Col xs={12}><Card><Statistic title="Time" value={parseTime(time)} /></Card></Col>
					<Col xs={12}><Card><Statistic title="Parkgoers" value={Parkgoer.all().reduce((total, parkgoer) => total + parkgoer.people, 0)} /></Card></Col>
					<Col xs={8}><Card><Statistic title="Free" value={Parkgoer.all().filter((parkgoer) => parkgoer.state === "FREE").reduce((total, parkgoer) => total + parkgoer.people, 0)} /></Card></Col>
					<Col xs={8}><Card><Statistic title="Waiting" value={Parkgoer.all().filter((parkgoer) => parkgoer.state === "WAIT").reduce((total, parkgoer) => total + parkgoer.people, 0)} /></Card></Col>
					<Col xs={8}><Card><Statistic title="Busy" value={Parkgoer.all().filter((parkgoer) => parkgoer.state === "BUSY").reduce((total, parkgoer) => total + parkgoer.people, 0)} /></Card></Col>
					</Row>
					<br />
					<Space direction="horizontal">
					<Button danger size="large" disabled={!ready} onClick={reset}>Reset</Button>
					<Button size="large" disabled={ready} onClick={() => loadSim(Specification)}>Load Default</Button>
					<Upload accept=".json" fileList={[]} beforeUpload={(file) => {
						(async () => {
							loadSim(JSON.parse(await file.text()));
						})();
						return false;
					}}><Button size="large" block disabled={ready}>Load File</Button></Upload>
					</Space>
				</Col>
				<Col xs={12}>
					<ActivityPane />
				</Col>
				</Row>
			</Col>
		</Row>
	);
};

export default App;