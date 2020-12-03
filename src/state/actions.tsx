import { IAction, EActionType} from "./types";

interface IActionUpdatePersistence extends IAction {
	data: {
		key: string,
		value: unknown,
	},
}

function updatePersistentData(key: string, value: unknown): IActionUpdatePersistence {
	return {
		type: EActionType.UPDATE_PERSISTENT_DATA,
		data: {
			key: key,
			value: value
		},
	};
}

function clearPersistence(): IAction {
	return {
		type: EActionType.CLEAR_PERSISTENT_DATA,
	};
}

export { 
	IActionUpdatePersistence,
	updatePersistentData,
	clearPersistence,
};