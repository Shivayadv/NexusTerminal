import { describe, expect, it } from 'vitest'

import {
  closePane,
  findFirstTerminalPane,
  findNode,
  findParent,
  getAllTerminalPanes,
  setPaneCwd,
  setPaneTitle,
  splitPane,
  updateSizes,
} from '../paneTree'
import type { PaneNode, SplitPane, TerminalPane } from '../types'

// ---------------------------------------------------------------------------
// Helpers

function makeTerminal(id = 'p1', terminalId = 't1'): TerminalPane {
  return { type: 'terminal', id, terminalId, title: 'powershell', shellType: 'powershell' }
}

function makeSplit(children: PaneNode[], direction: 'horizontal' | 'vertical' = 'horizontal'): SplitPane {
  return { type: 'split', id: 'split1', direction, children, sizes: children.map(() => 1) }
}

// ---------------------------------------------------------------------------
// findNode

describe('findNode', () => {
  it('returns root when id matches root', () => {
    const root = makeTerminal('p1')
    expect(findNode(root, 'p1')).toBe(root)
  })

  it('returns null when id does not exist', () => {
    const root = makeTerminal('p1')
    expect(findNode(root, 'no-such')).toBeNull()
  })

  it('finds a child terminal pane inside a split', () => {
    const pane = makeTerminal('p2')
    const root = makeSplit([makeTerminal('p1'), pane])
    expect(findNode(root, 'p2')).toBe(pane)
  })

  it('finds a deeply nested pane', () => {
    const deep = makeTerminal('deep')
    const inner = makeSplit([deep, makeTerminal('other')])
    const root = makeSplit([makeTerminal('p1'), { ...inner, id: 'inner' }])
    expect(findNode(root, 'deep')).toBe(deep)
  })
})

// ---------------------------------------------------------------------------
// findParent

describe('findParent', () => {
  it('returns null for a terminal root', () => {
    expect(findParent(makeTerminal(), 'p1')).toBeNull()
  })

  it('returns the split when child is a direct child', () => {
    const pane = makeTerminal('p2')
    const root = makeSplit([makeTerminal('p1'), pane])
    expect(findParent(root, 'p2')).toBe(root)
  })

  it('returns null when id does not exist', () => {
    const root = makeSplit([makeTerminal('p1'), makeTerminal('p2')])
    expect(findParent(root, 'no-such')).toBeNull()
  })

  it('finds parent of a nested pane', () => {
    const inner = makeSplit([makeTerminal('deep'), makeTerminal('p3')])
    const root = makeSplit([makeTerminal('p1'), { ...inner, id: 'inner' }])
    const parent = findParent(root, 'deep')
    expect(parent?.id).toBe('inner')
  })
})

// ---------------------------------------------------------------------------
// findFirstTerminalPane

describe('findFirstTerminalPane', () => {
  it('returns the terminal itself', () => {
    const pane = makeTerminal()
    expect(findFirstTerminalPane(pane)).toBe(pane)
  })

  it('returns the first terminal in a split (left-to-right depth-first)', () => {
    const first = makeTerminal('p1')
    const root = makeSplit([first, makeTerminal('p2')])
    expect(findFirstTerminalPane(root)).toBe(first)
  })

  it('descends into nested splits to find the first terminal', () => {
    const deep = makeTerminal('deep')
    const inner = { ...makeSplit([deep, makeTerminal('p3')]), id: 'inner' }
    const root = makeSplit([inner, makeTerminal('p2')])
    expect(findFirstTerminalPane(root)?.id).toBe('deep')
  })
})

// ---------------------------------------------------------------------------
// getAllTerminalPanes

describe('getAllTerminalPanes', () => {
  it('returns a single terminal for a leaf node', () => {
    const pane = makeTerminal()
    expect(getAllTerminalPanes(pane)).toEqual([pane])
  })

  it('returns all terminals in a flat split', () => {
    const a = makeTerminal('a')
    const b = makeTerminal('b')
    const result = getAllTerminalPanes(makeSplit([a, b]))
    expect(result).toHaveLength(2)
    expect(result[0]).toBe(a)
    expect(result[1]).toBe(b)
  })

  it('returns all terminals in a nested tree', () => {
    const a = makeTerminal('a')
    const b = makeTerminal('b')
    const c = makeTerminal('c')
    const inner = { ...makeSplit([a, b]), id: 'inner' }
    const root = makeSplit([inner, c])
    const result = getAllTerminalPanes(root)
    expect(result).toHaveLength(3)
    expect(result.map((p) => p.id)).toEqual(['a', 'b', 'c'])
  })
})

// ---------------------------------------------------------------------------
// splitPane

describe('splitPane', () => {
  it('returns unchanged root when paneId not found', () => {
    const root = makeTerminal('p1')
    const [newRoot] = splitPane(root, 'no-such', 'horizontal', 't2', 'powershell')
    expect(newRoot).toBe(root)
  })

  it('wraps the terminal in a split and adds a new pane', () => {
    const root = makeTerminal('p1')
    const [newRoot, newPaneId] = splitPane(root, 'p1', 'horizontal', 't2', 'powershell')
    expect(newRoot.type).toBe('split')
    const split = newRoot as SplitPane
    expect(split.children).toHaveLength(2)
    expect(split.children[0]?.id).toBe('p1')
    const newPane = split.children[1] as TerminalPane
    expect(newPane.id).toBe(newPaneId)
    expect(newPane.terminalId).toBe('t2')
    expect(split.direction).toBe('horizontal')
  })

  it('preserves original pane on leading side', () => {
    const root = makeTerminal('p1')
    const [newRoot] = splitPane(root, 'p1', 'vertical', 't2', 'powershell')
    const split = newRoot as SplitPane
    expect((split.children[0] as TerminalPane).id).toBe('p1')
  })

  it('assigns equal initial sizes', () => {
    const root = makeTerminal('p1')
    const [newRoot] = splitPane(root, 'p1', 'horizontal', 't2', 'powershell')
    const split = newRoot as SplitPane
    expect(split.sizes).toEqual([1, 1])
  })
})

// ---------------------------------------------------------------------------
// closePane

describe('closePane', () => {
  it('returns null when the root itself is removed', () => {
    const root = makeTerminal('p1')
    expect(closePane(root, 'p1')).toBeNull()
  })

  it('removes a child and collapses the split when one child remains', () => {
    const survivor = makeTerminal('p2')
    const root = makeSplit([makeTerminal('p1'), survivor])
    const result = closePane(root, 'p1')
    expect(result?.id).toBe('p2')
    expect(result?.type).toBe('terminal')
  })

  it('removes a child from a multi-child split', () => {
    const a = makeTerminal('a')
    const b = makeTerminal('b')
    const c = makeTerminal('c')
    const root: SplitPane = { type: 'split', id: 's', direction: 'horizontal', children: [a, b, c], sizes: [1, 1, 1] }
    const result = closePane(root, 'b') as SplitPane
    expect(result.children).toHaveLength(2)
    expect(result.sizes).toHaveLength(2)
    expect(result.children.map((ch) => ch.id)).toEqual(['a', 'c'])
  })

  it('is a no-op when paneId is not found', () => {
    const root = makeTerminal('p1')
    expect(closePane(root, 'no-such')).toBe(root)
  })
})

// ---------------------------------------------------------------------------
// updateSizes

describe('updateSizes', () => {
  it('updates sizes on the matching split', () => {
    const root = makeSplit([makeTerminal('p1'), makeTerminal('p2')])
    const result = updateSizes(root, 'split1', [2, 3]) as SplitPane
    expect(result.sizes).toEqual([2, 3])
  })

  it('returns the node unchanged when id does not match any split', () => {
    const root = makeSplit([makeTerminal('p1'), makeTerminal('p2')])
    const result = updateSizes(root, 'no-such', [2, 3])
    expect((result as SplitPane).sizes).toEqual([1, 1])
  })

  it('is a no-op on terminal panes', () => {
    const root = makeTerminal('p1')
    const result = updateSizes(root, 'p1', [2])
    expect(result).toBe(root)
  })
})

// ---------------------------------------------------------------------------
// setPaneTitle / setPaneCwd

describe('setPaneTitle', () => {
  it('updates the title of the matching pane', () => {
    const root = makeTerminal('p1')
    const result = setPaneTitle(root, 'p1', 'bash') as TerminalPane
    expect(result.title).toBe('bash')
  })

  it('is a no-op when pane id does not exist', () => {
    const root = makeTerminal('p1')
    const result = setPaneTitle(root, 'no-such', 'bash')
    expect(result).toBe(root)
  })

  it('updates the correct child inside a split', () => {
    const root = makeSplit([makeTerminal('p1'), makeTerminal('p2')])
    const result = setPaneTitle(root, 'p2', 'zsh') as SplitPane
    expect((result.children[1] as TerminalPane).title).toBe('zsh')
    expect((result.children[0] as TerminalPane).title).toBe('powershell')
  })
})

describe('setPaneCwd', () => {
  it('sets cwd on the matching terminal pane', () => {
    const root = makeTerminal('p1')
    const result = setPaneCwd(root, 'p1', '/home/user') as TerminalPane
    expect(result.cwd).toBe('/home/user')
  })

  it('is a no-op on a terminal pane that does not match', () => {
    const root = makeTerminal('p1')
    const result = setPaneCwd(root, 'other', '/home')
    expect(result).toBe(root)
  })

  it('propagates into nested splits', () => {
    const inner = makeTerminal('inner')
    const root = makeSplit([makeTerminal('p1'), { ...inner, id: 'inner' }])
    const result = setPaneCwd(root, 'inner', '/tmp') as SplitPane
    expect((result.children[1] as TerminalPane).cwd).toBe('/tmp')
  })
})
