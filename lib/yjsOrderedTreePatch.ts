import { Heap } from 'heap-js';
// @ts-ignore - package exports don't surface typings properly
import { YTree } from 'yjs-orderedtree';

type ComputedNode = {
  id: string;
  parent: ComputedNode | null;
  children: ComputedNode[];
  edges: Map<string, number>;
};

const ROOT_KEY = 'root';

let patched = false;

function edgeWithLargestCounter(node: ComputedNode): string | null {
  let edgeID: string | null = null;
  let largestCounter = -1;

  node.edges.forEach((counter, id) => {
    if (
      counter > largestCounter ||
      (counter === largestCounter && (edgeID === null || id > edgeID))
    ) {
      edgeID = id;
      largestCounter = counter;
    }
  });

  return edgeID;
}

function recomputeParentsAndChildrenSafe(this: any): void {
  const computedMap: Map<string, ComputedNode> = this.computedMap;
  const ymap = this._ymap;

  computedMap.clear();

  for (const nodeKey of ymap.keys()) {
    computedMap.set(nodeKey, {
      id: nodeKey,
      parent: null,
      children: [],
      edges: new Map(),
    });
  }

  for (const node of computedMap.values()) {
    const edges = node.edges;
    const yNode = ymap.get(node.id);
    const parentHistory = yNode?.get('_parentHistory');
    if (!parentHistory) continue;

    parentHistory.forEach((value: any, key: string) => {
      if (!computedMap.has(key) || typeof value?.counter !== 'number') {
        return;
      }
      edges.set(key, value.counter);
    });
  }

  const rootNode = computedMap.get(ROOT_KEY);
  if (!rootNode) {
    console.warn('[yjs-orderedtree] Missing root node during recompute');
    return;
  }

  computedMap.forEach((node, nodeKey) => {
    if (nodeKey === ROOT_KEY) return;

    const parentId = edgeWithLargestCounter(node);
    if (!parentId) {
      node.parent = null;
      return;
    }

    const parentNode = computedMap.get(parentId);
    if (!parentNode) {
      console.warn('[yjs-orderedtree] Parent node missing, deferring attachment', {
        child: nodeKey,
        parentId,
      });
      node.parent = null;
      return;
    }

    node.parent = parentNode;
    parentNode.children.push(node);
  });

  const allRootDescendants = new Set<string>();
  const descendantStack: string[] = [ROOT_KEY];
  while (descendantStack.length > 0) {
    const current = descendantStack.pop();
    if (current === undefined) continue;
    allRootDescendants.add(current);
    const children = computedMap.get(current)?.children || [];
    for (const child of children) {
      descendantStack.push(child.id);
    }
  }

  const nonRootedNodesTest = new Set<ComputedNode>();

  for (const [nodeKey, node] of computedMap.entries()) {
    if (!allRootDescendants.has(nodeKey)) {
      nonRootedNodesTest.add(node);
    }
    node.children = [];
  }

  const nonRootedNodes = new Set<ComputedNode>();

  for (const node of computedMap.values()) {
    if (!this.isNodeUnderOtherNode(node, rootNode)) {
      let cursor: ComputedNode | null = node;
      while (cursor && !nonRootedNodes.has(cursor)) {
        nonRootedNodes.add(cursor);
        cursor = cursor.parent;
      }
    }
  }

  if (nonRootedNodes.size > 0) {
    const deferredEdges = new Map<ComputedNode, { child: ComputedNode; parent: ComputedNode; counter: number }[]>();
    const readyEdges = new Heap<{ child: ComputedNode; parent: ComputedNode; counter: number }>((a, b) => {
      const counterDelta = b.counter - a.counter;
      if (counterDelta !== 0) return counterDelta;
      if (a.parent.id < b.parent.id) return -1;
      if (a.parent.id > b.parent.id) return 1;
      if (a.child.id < b.child.id) return -1;
      if (a.child.id > b.child.id) return 1;
      return 0;
    });

    for (const child of nonRootedNodes.values()) {
      for (const [parentKey, counter] of child.edges.entries()) {
        const parent = computedMap.get(parentKey);
        if (!parent) continue;
        if (!nonRootedNodes.has(parent)) {
          readyEdges.push({ child, parent, counter });
        } else {
          let edges = deferredEdges.get(parent);
          if (!edges) {
            edges = [];
            deferredEdges.set(parent, edges);
          }
          edges.push({ child, parent, counter });
        }
      }
    }

    for (let top; (top = readyEdges.pop()); ) {
      const { child, parent } = top;
      if (!nonRootedNodes.has(child)) continue;

      child.parent = parent;
      nonRootedNodes.delete(child);

      const edges = deferredEdges.get(child);
      if (edges) {
        for (const edge of edges) {
          readyEdges.push(edge);
        }
      }
    }
  }

  for (const node of computedMap.values()) {
    if (node.parent) {
      node.parent.children.push(node);
    }
  }

  for (const node of computedMap.values()) {
    node.children.sort((a, b) => {
      if (a.id < b.id) return -1;
      if (a.id > b.id) return 1;
      return 0;
    });
  }
}

function ensureSafeYTreePatch(): void {
  if (patched) return;
  const proto = (YTree as any).prototype;

  proto.recomputeParentsAndChildren = recomputeParentsAndChildrenSafe;
  patched = true;
}

ensureSafeYTreePatch();

export { ensureSafeYTreePatch };
