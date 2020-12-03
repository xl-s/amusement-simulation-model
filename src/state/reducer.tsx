import { IState, IAction, EActionType } from "./types";
import { IActionUpdatePersistence } from "./actions";


function reducer<T extends IAction>(state: IState, action: T): IState {
	let data;
	switch (action.type) {
		case EActionType.UPDATE_PERSISTENT_DATA:
			data = (action as unknown as IActionUpdatePersistence).data;
			return {
				...state,
				persistence: {
					...state.persistence,
					[data.key]: data.value,
				},
			};
		case EActionType.CLEAR_PERSISTENT_DATA:
			return {
				...state,
				persistence: {},
			};
		default:
			return state;
	}
}

export { reducer };