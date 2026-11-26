import {
  StrictMode,
} from "react";

import {
  createRoot,
} from "react-dom/client";

import "./index.css";
import "./App.css";

import { Provider } from "react-redux";
import App from "./App.jsx";
import { makeStore } from "./store";

const store = makeStore();

createRoot(
  document.getElementById("root")
).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>
);
