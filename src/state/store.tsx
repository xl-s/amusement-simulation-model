import { createStore } from "redux";
import { reducer } from "./reducer";
import { IState } from "./types";


const emptyState: IState = {
	persistence: {},
};

let initialState;
if (typeof window !== "undefined") {
	initialState = localStorage.getItem("redux-state") ? JSON.parse(localStorage.getItem("redux-state")) : emptyState;
} else {
	initialState = emptyState;
}

const store = createStore(reducer, initialState);

if (typeof window !== "undefined") {
	store.subscribe(() => {
		localStorage.setItem("redux-state", JSON.stringify(store.getState()));
	})
}

export { store, emptyState };