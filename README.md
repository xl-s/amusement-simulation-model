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
