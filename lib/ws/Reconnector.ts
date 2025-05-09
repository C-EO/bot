import { Manager } from "@fire/lib/Manager";
import { Websocket } from "./Websocket";
import { WebsocketStates } from "./util/constants";

export class Reconnector {
  sessionTimeout: NodeJS.Timeout;
  timeout?: NodeJS.Timeout;
  manager: Manager;
  state: number;

  constructor(manager: Manager) {
    this.manager = manager;
    this.state = WebsocketStates.IDLE;
    this.timeout = null;
    this.sessionTimeout = null;
  }

  handleOpen() {
    if (this.timeout) clearTimeout(this.timeout);
    if (this.state == WebsocketStates.RECONNECTING) {
      this.manager.getLogger("Aether").log("Reconnected to websocket");
      this.state = WebsocketStates.CONNECTED;
    } else {
      this.manager.getLogger("Aether").log("Connected to websocket");
      this.state = WebsocketStates.CONNECTED;
    }
    this.sessionTimeout = setTimeout(() => {
      if (!this.manager.ready && this.manager.ws?.open)
        this.manager.ws.close(4009, "Timed out waiting for session");
    }, 60000);
  }

  handleClose(code: number, reason: string) {
    clearTimeout(this.manager.ws?.keepAlive);
    clearInterval(this.manager.ws?.heartbeatTask);
    this.manager.ready = false;
    if (this.state != WebsocketStates.CLOSED) {
      this.state = WebsocketStates.CLOSED;
      this.manager
        .getLogger("Aether")
        .warn(
          `Disconnected from websocket (${
            this.manager.ws?.clientSideClose ? "client" : "server"
          }) with code ${code} and reason ${reason}.`
        );
    }
    if (code == 1006) this.manager.ws?.terminate();
    if (code == 1012) {
      // Aether has shut down, session will be invalid
      // I'll eventually make sessions persist though
      delete this.manager.session;
      delete this.manager.seq;
      return this.activate(
        process.env.NODE_ENV == "development" ? 10000 : 2500
      ); // takes longer to reboot in dev
    }
    if (code == 4000) {
      // Unknown error, we should wait some time before connecting
      // again to avoid spam in Aether's logs

      // This time is currently set as the CLUSTER_INTERVAL in Aether
      // so waiting for this time should ensure any stale clusters that
      // may be preventing a connection are killed
      return this.activate(30000);
    }
    if (code == 4007)
      // Cluster has attempted to connect multiple times
      // so kill the process and let pm2 restart it
      this.manager.kill("replaced");
    if (code == 4029 && reason != "You are being rate limited")
      // This means that the current process is
      // an extra, so it's unnecessary to keep alive
      this.manager.kill("extra");
    else if (code == 4029) {
      // TODO: actually handle ratelimit instead of just reconnecting in 5s
      this.activate();
    }
    if (code == 4005) {
      delete this.manager.session;
      delete this.manager.seq;
      return this.activate(0); // reconnect instantly for new session
    }
    this.activate();
  }

  handleError(error: any) {
    if (error.code == "ECONNREFUSED") this.activate(8000);
    else {
      this.manager.getLogger("Aether").error(`Received error event: ${error}`);
      this.activate(5000);
    }
  }

  activate(timeout: number = 5000) {
    if (!timeout) return this.reconnect(false);
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = setTimeout(this.reconnect.bind(this), timeout);
  }

  reconnect(log = true) {
    if (log)
      this.manager.getLogger("Aether").info("Attempting to reconnect...");
    // it likes to try reconnect while already connected sometimes
    // why? not a single fucking clue
    if (this.manager.ws?.open) this.manager.ws.close(4000, "brb");
    this.state = WebsocketStates.RECONNECTING;
    this.manager.ws?.removeAllListeners();
    this.manager.ws?.terminate();
    delete this.manager.ws;
    this.manager.ws = new Websocket(this.manager);
    this.manager.init(true);
  }
}
