import { bindKeyedSuspense } from "@cprecioso/react-suspense";
import ManyKeysMap from "many-keys-map";
import { useCallback, useMemo, useState, useTransition } from "react";
import {
  AnyKey,
  SetStateArg,
  State,
  arrayElementsAreEqual,
  createStateSetter,
} from "./util";

const justCall = <T>(fn: () => T) => fn();

export type FetcherHook<K extends AnyKey, V> = (
  key: K,
) => FetcherHookResponse<V>;

export interface FetcherHookResponse<V> {
  /**
   * Get the data. If it has not been fetched before, this will suspend the component.
   */
  get: () => V;

  /**
   * Update the local cache for the data.
   *
   * @remark
   * If you want to update the cache and re-feth the data, use `revalidate` instead.
   */
  mutate: (nextValueOrUpdaterFn: SetStateArg<V>) => void;

  /**
   * Trigger a re-fetch of the data.
   *
   * By default, it will do so in a transition (meaning, React will show the old data
   * and wait for the updated data to be fetched before showing it).
   *
   * If you want to suspend the component tree and show the fallback of the nearest
   * `Suspense` boundary, pass `withTransition: false`.
   *
   * @remark
   * If you want to update the cache without re-fetching the data, use `mutate` instead.
   */
  revalidate: (
    nextValueOrUpdaterFn?: SetStateArg<V>,
    options?: { withTransition?: boolean },
  ) => void;

  /**
   * If you called `revalidate` with a transition, this will be `true` while the
   * new data is being fetched.
   */
  isRevalidating: boolean;
}

/**
 * Creates a new hook that fetches data from an async source.
 */
export const makeFetchHook = <K extends AnyKey, V>(
  /** The function that will do the data fetching. */
  fetcher: (...key: K) => Promise<V>,
): FetcherHook<K, V> => {
  const { suspend, cache } = bindKeyedSuspense<K, V>((key) => fetcher(...key), {
    storage: new ManyKeysMap(),
  });

  const getCachedValue = (key: K) => {
    const cachedState = cache.get(key);
    return cachedState?.status === "fulfilled" ? cachedState.value : null;
  };

  const useFetcher = (key: K): FetcherHookResponse<V> => {
    const [isPending, startTransition] = useTransition();

    const [_optimisticState, setOptimisticState] = useState<State<K, V> | null>(
      null,
    );
    const optimisticState = useMemo(
      () =>
        _optimisticState && arrayElementsAreEqual(_optimisticState.key, key)
          ? _optimisticState.value
          : null,
      [_optimisticState, key],
    );

    const get = useCallback<FetcherHookResponse<V>["get"]>(
      () => optimisticState ?? suspend(key),
      [optimisticState, key],
    );

    const mutate = useCallback<FetcherHookResponse<V>["mutate"]>(
      (stateArg) => {
        if (stateArg) {
          setOptimisticState(
            createStateSetter(key, getCachedValue(key), stateArg),
          );
        }
      },
      [key],
    );

    const revalidate = useCallback<FetcherHookResponse<V>["revalidate"]>(
      (stateArg, { withTransition = true } = {}) => {
        if (stateArg) {
          setOptimisticState(
            createStateSetter(key, getCachedValue(key), stateArg),
          );
        }

        const transitionFn = withTransition ? startTransition : justCall;

        transitionFn(() => {
          cache.set(key, null);
          setOptimisticState(null);
        });
      },
      [key],
    );

    return { get, revalidate, mutate, isRevalidating: isPending };
  };

  return useFetcher;
};
