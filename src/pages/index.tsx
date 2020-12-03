import React from "react";
import { Provider } from "react-redux";
import { store } from "../state/store";
import App from "../components/app";


const IndexPage = (): React.FC => {
	return (
		<Provider store={store}>
			<App />
		</Provider>
	);
};

export default IndexPage;
