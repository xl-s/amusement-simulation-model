### Setup Configuration

* All distance and coordinate units are expressed as a proportion of the park size. For example, 0.1 distance means 10% of the total park's width.
* All angles are in degrees.
* All time units are in minutes.
* A uniform distribution may be assumed for quantities which have respective "range" parameters.

```
{
    "simulation": {
        "duration": (duration of simulation)
    },
    "parkgoers": {
        "rate": {
            "polynomial": (array of polynomial coefficients)
        },
        "movespeed": (mean distance covered by parkgoer per unit time),
        "speedrange": (optional, variation of distance covered),
        "privileges": [
        	{
        		"privilege": (label of privilege),
        		"probability": (probability this privilege is assigned to a parkgoer)
        	}
        ],
        "groupsize": [
        	{
        		"size": (number of people in a parkgoer unit - parkgoers with size 1 are automatically assigned the 'single' privilege),
        		"probability": (probability this size is assigned to a parkgoer)
        	}
        ]
    },
    "activities": [
    	{
    		"label": (name of activity),
    		"icon": (icon to display for this activity),
    		"relativeProcesses": (optional defaulting to false, whether this activity's processes have a fixed rotation of seating),
    		"assigner": (optional defaulting to 'shortestQueue', the policy with which to assign parkgoers to queues),
    		"consumer": (optional defaulting to 'turnBased', the policy with which to pick parkgoers from queues to join processes),
    		"position": {
    			"x": (x coordinate of activity, optional if 'angle' is specified),
    			"y": (y coordinate of activity, optional if 'angle' is specified),
    			"angle": (angular location of activity, optional if 'x' and 'y' are specified)
    		},
    		"processes": [
    			{
    				"duration": (mean length of activity),
    				"durationRange": (optional, variation of length of activity),
    				"capacity": (maximum parkgoers in this process),
    				"type" (optional defaulting to 'person', either 'group' where capacity refers to the total number of groups, or 'person' where capacity refers to the total number of persons)
    			}
    		],
    		"queues": [
    			{
    				"display": (optional) {
    					"offset": {
    						"x": (x offset of queue from activity, optional if 'angle' is specified),
    						"y": (y offset of queue from activity, optional if 'angle' is specifed),
    						"angle": (angular offset of queue from activity, optional if 'x' and 'y' are specified)
    					},
    					"angle": (angle at which the queue is directed),
    					"spacing": (optional defaulting to 0.0125, spacing between parkgoers in the queue)
    				},
    				"privileges": (optional, array of privilege labels for which this queue is restricted to; if empty, anyone can join the queue)
    			}
    		],
    		"popularity": (proportion of parkgoers that attend this activity, optional if 'station' is specified),
    		"station": (optional, either 'before' which sets this activity as required before participating in other activities, or 'after' which sets this activity as required after participating in other activities)
    	}
    ]
}
```

The following options for `activities.icon` are available:

* `booth`
* `bumper`
* `coaster`
* `door`
* `ferris`
* `flume`
* `merry`
* `ship`
* `tower`
* `turnstile`

The following options for `activities.consumer` are available:

* `turnBased`: parkgoers are drawn from queues in a turned-based ordering.
* `longestQueue`: parkgoers are drawn from the longest queue.
* `custom`: parkgoers are drawn from "priority" queue until at least  half the ride is full, then from the unprivileged queue, then from "single" queue.

The following options for `activities.assigner` are available:

* `shortestQueue`: parkgoers join the shortest queue available to them.

### Output Format

```
{
	"statistics": {
		"parkgoers": {
			"total": (total visitors to park),
			(category): (visitors to park under category)
		}
	},
	"parkgoers": [
		{
			"privileges": (string array of privileges),
			"people": (number of people in this parkgoer group),
			"record": [
				{
					"time": (time of record),
					"state": (one of 'FREE', 'BUSY', or 'WAIT'),
					"next": (current or next activity for parkgoer)
				}
			],
			"statistics": {
				"free": (proportion of time spent in 'FREE' state),
				"busy": (proportion of time spent in 'BUSY' state),
				"wait": (proportion of time spent in 'WAIT' state)
			}
		}
	],
	"activities": {
		rides: [
			{
				"label": (label of ride),
				"icon": (icon of ride),
				"statistics": {
					"parkgoers": (total visitors to this ride)
				},
				"processes": [
					{
						"capacity": (capacity of process),
						"record": [
							{
								"time": (time of record),
								"occupants": (occupants in process),
								"active": (whether process is active),
								"progress": (current progress of this process cycle),
								"currentDuration": (current duration of this process cycle)
							}
						]
					}
				],
				"queues": [
					{
						"privileges": (string array of privileges),
						"statistics": {
							"meanWaitTime": (mean waiting time of this queue)
						},
						"record": [
							{
								"time": (time of record),
								"length": (length of queue)
							}
						]
					}
				]
			}
		],
		"stations": {
			"before": (same as activities.rides),
			"after": (same as activities.rides)
		}
	}
}
```

### Model Architecture

The model is written in TypeScript and utilizes the ReactJS framework and Ant Design component library for the user interface. The source code is compiled with Gatsby to optimize and improve the speed of the simulation.

#### Overview

The model uses an object-oriented paradigm. The following objects are relevant to the model:

* `Parkgoer` — represents a parkgoer agent that may be either a single visitor to the park, or a group of visitors that participate in all activities together. A `Parkgoer` has an `itinerary`, which is a set of `Activity` that they will complete within the park, as well as a set of `privileges` that determine which queues they can join. A `Parkgoer` may be in one of three states: `"FREE"`, in which they are moving around the park to their next destination, `"WAIT"`, in which they are waiting in the `Queue` of an `Activity`, and `"BUSY"`, in which they are participating in a `Process` of an `Activity`.
* `Process` — represents the actual "activity" portion of an `Activity`. A `Process` has a `capacity`, which is the maximum total of parkgoers that may attend the ride at a time, and a `duration`, which is the time that the `Process` runs for before the attending parkgoers are released from it.
* `Queue` — represents a queue in which parkgoer agents reside in while waiting for their turn in a `Process`.
* `Activity` — represents an activity that parkgoer agents may participate in. An `Activity` consists of at least one `Queue` and at least one `Process`. In addition, the `Activity` defines `assigner` and `consumer` policies. When a `Parkgoer` is assigned to the `Activity`, the `assigner` policy determines the `Queue` which the `Parkgoer` joins. When a `Process` is ready to accept a new `Parkgoer`, the `consumer` policy determines the `Queue` which this `Parkgoer` will be drawn from.

#### Iteration

![](https://xuliang.dev/static/useinterval.png)

When the simulation is run, an `iterate` function is called at a set interval, which triggers the respective `iterate` methods of the active `Parkgoer` and `Activity` objects, as well as a `log` method which writes relevant information to a record that is exported at the end of the simulation. New parkgoers are also added to the park and assigned an `itinerary`, number of `people`, and set of `privileges`.

![](https://xuliang.dev/static/iterate.png)

The `iterate` method of a `Parkgoer` object  checks whether the parkgoer's itinerary has been completed, and if so, removes itself from the simulation. Otherwise, if it is in a `"FREE"` state, it executes movement logic, and assigns it to the next target activity if it has arrived. `"WAIT"` and `"BUSY"` states are handled by the relevant `Activity`.

![](https://xuliang.dev/static/parkgoer.iterate.png)

The `iterate` method of an `Activity` object first calls the `iterate` method of its `Process`. Then, it acquires new `Parkgoer`s into idle processes using its defined `consumer`. An `Activity` may be set with a `relativeProcesses` attribute, which locks the entry ordering of processes into a fixed rotation (an example from the default configuration is the Ferris Wheel ride).

![](https://xuliang.dev/static/activity.iterate.png)

The `consumer` is typically defined with a generator function. The default configuration uses a custom `consumer`, which attempts to draw parkgoers from the priority queue until the process is at half capacity, then from the normal queue, before filling in the remaining capacity from the single rider queue.

![](https://xuliang.dev/static/consumerfunction.png)

Within the `iterate` method of a `Process`, an internal `time` counter is incremented until it exceeds the currently set `duration`, after which it releases its parkgoers, who then become free to move to the next activity in their itinerary.

![](https://xuliang.dev/static/process.iterate.png)

Parkgoers must first complete all of the activities within `stations.before` in their defined order, followed by all of the ride activities, before finishing off with the activities in `stations.after`. When selecting a ride activity, a greedy policy is used; the next activity will be set as the one with the shortest queue which the parkgoer is able to join.

![](https://xuliang.dev/static/parkgoer.getnexttarget.png)

#### Random Variate Generation

![](https://xuliang.dev/static/loadsim.png)

##### Parkgoer Entries

Parkgoer entries are generated from a polynomial rate distribution. The number of people entering the park at time `t` is Poisson-distributed with parameter $\begin{bmatrix}c_0 && c_1 && c_2 && \cdots\end{bmatrix}\begin{bmatrix}1\\t\\t^2\\\vdots\end{bmatrix}$.

![](https://xuliang.dev/static/parkgoerrate.png)

##### Privileges

Parkgoer privileges are generated with the inverse-transform method, corresponding to a P.M.F. that is specified in the configuration.

![](https://xuliang.dev/static/getprivilege.png)

##### Group Size

Parkgoer group sizes are generated similarly to parkgoer privileges, using the inverse-transform method and corresponding to a P.M.F. that is specified in the configuration.

![](https://xuliang.dev/static/getpeople.png)

##### Itinerary

Rides are included in an itinerary with probability equal to their popularity. Stations are required activities that are appended to the itinerary.

![](https://xuliang.dev/static/getitinerary.png)