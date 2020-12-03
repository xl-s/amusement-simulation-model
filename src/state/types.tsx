enum EActionType {
	UPDATE_PERSISTENT_DATA,
	CLEAR_PERSISTENT_DATA,
}

interface IState {
	persistence: Record<string, unknown>,
}

interface IAction {
	type: EActionType,
}

export { 
	EActionType, 
	IState, 
	IAction 
};