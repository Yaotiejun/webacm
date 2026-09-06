import { describe, expect, it } from 'vitest'
import { popRedoWithCurrentToUndo, popUndoWithCurrentToRedo, pushUndoAndClearRedo } from './sessionHistory'

describe('cam.sessionHistory', () => {
  it('pushes undo snapshot and clears redo', () => {
    const next = pushUndoAndClearRedo({ undoStack: [1], redoStack: [9] }, 2, 3)
    expect(next.undoStack).toEqual([1, 2])
    expect(next.redoStack).toEqual([])
  })

  it('pops undo and pushes current into redo', () => {
    const { nextState, target } = popUndoWithCurrentToRedo({ undoStack: [1, 2], redoStack: [] }, 5, 3)
    expect(target).toBe(2)
    expect(nextState.undoStack).toEqual([1])
    expect(nextState.redoStack).toEqual([5])
  })

  it('pops redo and pushes current into undo', () => {
    const { nextState, target } = popRedoWithCurrentToUndo({ undoStack: [1], redoStack: [7] }, 4, 3)
    expect(target).toBe(7)
    expect(nextState.undoStack).toEqual([1, 4])
    expect(nextState.redoStack).toEqual([])
  })

  it('trims undo stack to maxHistory on push', () => {
    const next = pushUndoAndClearRedo({ undoStack: [1, 2], redoStack: [9] }, 3, 2)
    expect(next.undoStack).toEqual([2, 3])
    expect(next.redoStack).toEqual([])
  })

  it('returns unchanged state when undo stack is empty', () => {
    const state = { undoStack: [] as number[], redoStack: [] as number[] }
    const { nextState, target } = popUndoWithCurrentToRedo(state, 5, 10)
    expect(nextState).toBe(state)
    expect(target).toBeNull()
  })

  it('returns unchanged state when redo stack is empty', () => {
    const state = { undoStack: [1], redoStack: [] as number[] }
    const { nextState, target } = popRedoWithCurrentToUndo(state, 5, 10)
    expect(nextState).toBe(state)
    expect(target).toBeNull()
  })

  it('does not push current into redo when current is null on undo pop', () => {
    const { nextState, target } = popUndoWithCurrentToRedo({ undoStack: [1, 2], redoStack: [9] }, null, 10)
    expect(target).toBe(2)
    expect(nextState.undoStack).toEqual([1])
    expect(nextState.redoStack).toEqual([9])
  })

  it('trims redo to maxHistory when appending current on undo pop', () => {
    const { nextState } = popUndoWithCurrentToRedo({ undoStack: [1, 2], redoStack: [8, 7] }, 6, 2)
    expect(nextState.redoStack).toEqual([7, 6])
  })

  it('does not push current into undo when current is null on redo pop', () => {
    const { nextState, target } = popRedoWithCurrentToUndo({ undoStack: [3], redoStack: [8, 9] }, null, 10)
    expect(target).toBe(9)
    expect(nextState.redoStack).toEqual([8])
    expect(nextState.undoStack).toEqual([3])
  })

  it('trims undo to maxHistory when appending current on redo pop', () => {
    const { nextState } = popRedoWithCurrentToUndo({ undoStack: [1, 2], redoStack: [9] }, 5, 2)
    expect(nextState.undoStack).toEqual([2, 5])
    expect(nextState.redoStack).toEqual([])
  })
})
