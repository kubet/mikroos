/* @refresh reload */
import { render } from "solid-js/web";
import { inject } from "@vercel/analytics";
import "./index.css";
import App from "./ui/App";

inject();

render(() => <App />, document.getElementById("root")!);
