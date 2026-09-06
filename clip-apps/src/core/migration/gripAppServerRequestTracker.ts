/**
 * grip `app-server` open request / websocket counters (`openReq` / `openSock`).
 */
export class GripAppServerRequestTracker {
  private openRequests = 0
  private openSockets = 0
  private completedRequests = 0
  private completedSockets = 0

  openRequest(): () => void {
    this.openRequests += 1
    let closed = false
    return () => {
      if (closed) return
      closed = true
      this.openRequests = Math.max(0, this.openRequests - 1)
      this.completedRequests += 1
    }
  }

  openSocket(): () => void {
    this.openSockets += 1
    let closed = false
    return () => {
      if (closed) return
      closed = true
      this.openSockets = Math.max(0, this.openSockets - 1)
      this.completedSockets += 1
    }
  }

  snapshot() {
    return {
      openRequests: this.openRequests,
      openSockets: this.openSockets,
      completedRequests: this.completedRequests,
      completedSockets: this.completedSockets,
    }
  }
}
