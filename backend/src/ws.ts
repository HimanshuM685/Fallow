import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import {
  WS,
  type AgentHelloMsg,
  type ContainerFailedMsg,
  type ContainerReadyMsg,
  type HeartbeatMsg,
  type HelloAckMsg,
  type JobResultMsg,
  type SandboxAccess,
  type SandboxLimits,
  type StartContainerMsg,
} from "@tendril/shared";
import { verifyAgentHello } from "./auth.js";
import { markOffline, touchHeartbeat, upsertNode } from "./registry.js";
import { activateLease, endLeaseAndBill, getLease, leasesForNode, setLeaseStatus } from "./leases.js";

/** nodeId -> the socket of the agent currently hosting that node. */
const agentSockets = new Map<string, Socket>();

/** Pending promises awaiting a container to come up, keyed by leaseId. */
const pendingContainers = new Map<
  string,
  { resolve: (access: SandboxAccess) => void; reject: (err: Error) => void }
>();

/** Pending promises awaiting job results, keyed by jobId. */
const pendingJobs = new Map<
  string,
  { resolve: (r: JobResultMsg) => void; reject: (err: Error) => void }
>();

export function initWs(httpServer: HttpServer, corsOrigin: string | string[] = "*"): Server {
  const io = new Server(httpServer, { cors: { origin: corsOrigin } });

  io.on("connection", (socket) => {
    let boundNodeId: string | null = null;

    socket.on(WS.hello, (msg: AgentHelloMsg) => {
      if (!verifyAgentHello(msg.ownerAddr, msg.nonce, msg.signature)) {
        socket.emit("error-message", "hello rejected: bad signature/nonce");
        socket.disconnect(true);
        return;
      }
      const node = upsertNode({ id: msg.nodeId, ...msg.spec });
      boundNodeId = node.id;
      agentSockets.set(node.id, socket);
      const ack: HelloAckMsg = { nodeId: node.id };
      socket.emit(WS.helloAck, ack);
      console.log(`[ws] node online: ${node.id} (${node.label}) owner=${node.ownerAddr}`);
    });

    socket.on(WS.heartbeat, (_msg: HeartbeatMsg) => {
      if (boundNodeId) touchHeartbeat(boundNodeId);
    });

    socket.on(WS.containerReady, (msg: ContainerReadyMsg) => {
      const lease = getLease(msg.leaseId);
      if (!lease) return;
      // Password is the renter's own address; compose a copyable connect command.
      const access: SandboxAccess = {
        kind: "ssh",
        host: msg.host,
        port: msg.port,
        username: "root",
        password: lease.renterAddr,
        command: `ssh root@${msg.host} -p ${msg.port}`,
      };
      // Marks the lease active and starts the billable window.
      activateLease(msg.leaseId, access);
      pendingContainers.get(msg.leaseId)?.resolve(access);
      pendingContainers.delete(msg.leaseId);
    });

    socket.on(WS.containerFailed, (msg: ContainerFailedMsg) => {
      setLeaseStatus(msg.leaseId, "failed");
      pendingContainers.get(msg.leaseId)?.reject(new Error(msg.error));
      pendingContainers.delete(msg.leaseId);
    });

    socket.on(WS.jobResult, (msg: JobResultMsg) => {
      pendingJobs.get(msg.jobId)?.resolve(msg);
      pendingJobs.delete(msg.jobId);
    });

    socket.on("disconnect", () => {
      if (boundNodeId) {
        // The node's gone — bill + end any leases it was hosting, then mark it offline.
        for (const lease of leasesForNode(boundNodeId)) {
          void endLeaseAndBill(lease.id, "node-disconnected");
        }
        markOffline(boundNodeId);
        if (agentSockets.get(boundNodeId) === socket) agentSockets.delete(boundNodeId);
        console.log(`[ws] node offline: ${boundNodeId}`);
      }
    });
  });

  return io;
}

export function isNodeConnected(nodeId: string): boolean {
  return agentSockets.has(nodeId);
}

/**
 * Ask the agent to start a sandbox; resolves with the SSH access details when
 * the container is up and the bore endpoint is known.
 */
export function startContainer(
  nodeId: string,
  leaseId: string,
  image: string,
  limits: SandboxLimits,
  sshPassword: string,
  // Generous: the agent may be pulling the sandbox image on first use.
  timeoutMs = 180_000,
): Promise<SandboxAccess> {
  const socket = agentSockets.get(nodeId);
  if (!socket) return Promise.reject(new Error("node not connected"));

  return new Promise<SandboxAccess>((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingContainers.delete(leaseId);
      reject(new Error("container start timed out"));
    }, timeoutMs);

    pendingContainers.set(leaseId, {
      resolve: (access) => {
        clearTimeout(timer);
        resolve(access);
      },
      reject: (err) => {
        clearTimeout(timer);
        reject(err);
      },
    });

    const msg: StartContainerMsg = { leaseId, image, limits, sshPassword };
    socket.emit(WS.startContainer, msg);
  });
}

/** Tell the agent to destroy a lease's sandbox (best-effort). */
export function destroyContainer(nodeId: string, leaseId: string): void {
  agentSockets.get(nodeId)?.emit(WS.destroyContainer, { leaseId });
}

/** Run a job inside an existing lease's sandbox; resolves with the result. */
export function runJob(
  nodeId: string,
  leaseId: string,
  jobId: string,
  payload: string,
  timeoutMs = 120_000,
): Promise<JobResultMsg> {
  const socket = agentSockets.get(nodeId);
  if (!socket) return Promise.reject(new Error("node not connected"));

  return new Promise<JobResultMsg>((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingJobs.delete(jobId);
      reject(new Error("job timed out"));
    }, timeoutMs);

    pendingJobs.set(jobId, {
      resolve: (r) => {
        clearTimeout(timer);
        resolve(r);
      },
      reject: (err) => {
        clearTimeout(timer);
        reject(err);
      },
    });

    socket.emit(WS.runJob, { leaseId, jobId, payload });
  });
}
