export interface SessionHistoryState<T> {
  undoStack: T[]
  redoStack: T[]
}

function trimToMax<T>(items: T[], maxHistory: number): T[] {
  return items.length > maxHistory ? items.slice(-maxHistory) : items
}

export function pushUndoAndClearRedo<T>(
  state: SessionHistoryState<T>,
  snapshot: T,
  maxHistory: number,
): SessionHistoryState<T> {
  return {
    undoStack: trimToMax([...state.undoStack, snapshot], maxHistory),
    redoStack: [],
  }
}

export function popUndoWithCurrentToRedo<T>(
  state: SessionHistoryState<T>,
  current: T | null,
  maxHistory: number,
): { nextState: SessionHistoryState<T>; target: T | null } {
  if (!state.undoStack.length) return { nextState: state, target: null }
  const target = state.undoStack[state.undoStack.length - 1] as T
  const undoRest = state.undoStack.slice(0, -1)
  const redoNext = current == null ? state.redoStack : trimToMax([...state.redoStack, current], maxHistory)
  return {
    nextState: { undoStack: undoRest, redoStack: redoNext },
    target,
  }
}

export function popRedoWithCurrentToUndo<T>(
  state: SessionHistoryState<T>,
  current: T | null,
  maxHistory: number,
): { nextState: SessionHistoryState<T>; target: T | null } {
  if (!state.redoStack.length) return { nextState: state, target: null }
  const target = state.redoStack[state.redoStack.length - 1] as T
  const redoRest = state.redoStack.slice(0, -1)
  const undoNext = current == null ? state.undoStack : trimToMax([...state.undoStack, current], maxHistory)
  return {
    nextState: { undoStack: undoNext, redoStack: redoRest },
    target,
  }
}
