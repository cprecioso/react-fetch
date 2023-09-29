export const arrayElementsAreEqual = <T extends readonly unknown[]>(
  a: T,
  b: T,
) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

export type AnyKey = readonly unknown[];
export type State<K extends AnyKey, V> = { key: K; value: V };
export type SetStateArg<V> = (data: V) => V;

export const createStateSetter = <K extends AnyKey, V>(
  key: K,
  cachedValue: V | null | undefined,
  nextValueOrUpdaterFn: SetStateArg<V>,
): ((prevState: State<K, V> | null) => State<K, V> | null) => {
  if (typeof nextValueOrUpdaterFn === "function") {
    const updaterFn = nextValueOrUpdaterFn as (data: V) => V;

    return (prevState: State<K, V> | null) => {
      const prevValue =
        prevState && arrayElementsAreEqual(prevState.key, key)
          ? prevState.value
          : cachedValue;

      if (prevValue != null) {
        const nextValue = updaterFn(prevValue);
        const nextState = { key, value: nextValue };
        return nextState;
      } else {
        return prevState;
      }
    };
  } else {
    const nextValue = nextValueOrUpdaterFn as V;

    return (prevState: State<K, V> | null) => {
      const hasSameKey = prevState && arrayElementsAreEqual(prevState.key, key);
      return hasSameKey ? { key, value: nextValue } : prevState;
    };
  }
};
