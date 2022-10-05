import { renderHook, act } from "@testing-library/react-hooks";

import { getSandpackStateFromProps } from "../../utils/sandpackUtils";

import { useClient } from "./useClient";
import type { UseClientOperations } from "./useClient";

const getAmountOfListener = (
  instance: UseClientOperations,
  name = "client-id",
  ignoreGlobalListener = false
): number => {
  return (
    Object.keys(instance.clients[name].iframeProtocol.channelListeners).length -
    1 - // less protocol listener
    (ignoreGlobalListener ? 0 : 1) // less the global Sandpack-react listener
  );
};

describe(useClient, () => {
  it("sets a listener, but the client hasn't been created yet - no global listener", () => {
    const { result } = renderHook(() =>
      useClient({}, getSandpackStateFromProps({}))
    );

    const operations = result.current[1];

    // Act: Add listener
    const mock = jest.fn();
    act(() => {
      operations.addListener(mock, "client-id");
    });

    // Act: Create client
    act(() => {
      operations.registerBundler(document.createElement("iframe"), "client-id");

      operations.runSandpack();
    });

    // Expect: one pending unsubscribe function
    expect(
      Object.keys(operations.unsubscribeClientListenersRef.current["client-id"])
        .length
    ).toBe(1);

    // Expect: no global listener
    expect(
      Object.keys(operations.queuedListenersRef.current.global).length
    ).toBe(0);

    // Expect: one client
    expect(Object.keys(operations.clients)).toEqual(["client-id"]);
  });

  it("sets a listener, but the client hasn't been created yet - global listener", () => {
    const { result } = renderHook(() =>
      useClient({}, getSandpackStateFromProps({}))
    );

    const operations = result.current[1];

    // Act: Add listener
    const mock = jest.fn();
    act(() => {
      operations.addListener(mock /* , no client-id */);
    });

    // Act: Create client
    act(() => {
      operations.registerBundler(document.createElement("iframe"), "client-id");
      operations.runSandpack();
    });

    // Expect: one pending unsubscribe function
    expect(
      Object.keys(operations.unsubscribeClientListenersRef.current["client-id"])
        .length
    ).toBe(1);

    // Expect: no global listener
    expect(
      Object.keys(operations.queuedListenersRef.current.global).length
    ).toBe(1);

    // Expect: one listener in the client
    expect(getAmountOfListener(operations)).toBe(1);
  });

  it("set a listener, but the client has already been created - no global listener", () => {
    const { result } = renderHook(() =>
      useClient({}, getSandpackStateFromProps({}))
    );
    const operations = result.current[1];

    // Act: Create client
    act(() => {
      operations.registerBundler(document.createElement("iframe"), "client-id");
      operations.runSandpack();
    });

    // Expect: no pending unsubscribe function
    expect(
      Object.keys(operations.unsubscribeClientListenersRef.current["client-id"])
        .length
    ).toBe(0);

    // Expect: no global listener
    expect(
      Object.keys(operations.queuedListenersRef.current.global).length
    ).toBe(0);

    // Act: Add listener
    const mock = jest.fn();
    act(() => {
      operations.addListener(mock, "client-id");
    });

    // Expect: no pending unsubscribe function
    expect(
      Object.keys(operations.unsubscribeClientListenersRef.current["client-id"])
        .length
    ).toBe(0);

    // Expect: no global listener
    expect(
      Object.keys(operations.queuedListenersRef.current.global).length
    ).toBe(0);

    // Expect: one listener in the client
    expect(getAmountOfListener(operations)).toBe(1);
  });

  it("set a listener, but the client has already been created - global listener", () => {
    const { result } = renderHook(() =>
      useClient({}, getSandpackStateFromProps({}))
    );
    const operations = result.current[1];

    // Act: Create client
    act(() => {
      operations.registerBundler(document.createElement("iframe"), "client-id");
      operations.runSandpack();
    });

    // Expect: no pending unsubscribe function
    expect(
      Object.keys(operations.unsubscribeClientListenersRef.current["client-id"])
        .length
    ).toBe(0);

    // Expect: no global listener
    expect(
      Object.keys(operations.queuedListenersRef.current.global).length
    ).toBe(0);

    // Act: Add listener
    const mock = jest.fn();
    act(() => {
      operations.addListener(mock /* , no client-id */);
    });

    // Expect: no pending unsubscribe function, because it's a global
    expect(
      Object.keys(operations.unsubscribeClientListenersRef.current["client-id"])
        .length
    ).toBe(0);

    // Expect: one global listener
    expect(
      Object.keys(operations.queuedListenersRef.current.global).length
    ).toBe(1);

    // Expect: one listener in the client
    expect(getAmountOfListener(operations)).toBe(1);
  });

  it("sets a new listener, and then create one more client", () => {
    const { result } = renderHook(() =>
      useClient({}, getSandpackStateFromProps({}))
    );
    const operations = result.current[1];

    // Act: Add listener
    act(() => {
      const mock = jest.fn();
      operations.addListener(mock, "client-id");
    });

    // Act: Create client
    act(() => {
      operations.registerBundler(document.createElement("iframe"), "client-id");
      operations.runSandpack();
    });

    // Expect: one pending unsubscribe function
    expect(
      Object.keys(operations.unsubscribeClientListenersRef.current["client-id"])
        .length
    ).toBe(1);

    // Expect: no global listener
    expect(
      Object.keys(operations.queuedListenersRef.current.global).length
    ).toBe(0);

    // Expect: one listener in the client
    expect(getAmountOfListener(operations)).toBe(1);

    // Act: Add one more listener
    act(() => {
      const anotherMock = jest.fn();
      operations.addListener(anotherMock /* , no client-id */);
    });

    // Expect: one global listener
    expect(
      Object.keys(operations.queuedListenersRef.current.global).length
    ).toBe(1);

    // Expect: two listener in the client
    expect(getAmountOfListener(operations)).toBe(2);
  });

  it("unsubscribes only from the assigned client id", () => {
    const { result } = renderHook(() =>
      useClient({}, getSandpackStateFromProps({}))
    );
    const operations = result.current[1];

    act(() => {
      operations.registerBundler(document.createElement("iframe"), "client-1");
      operations.registerBundler(document.createElement("iframe"), "client-2");

      operations.runSandpack();
    });

    // Initial state
    expect(getAmountOfListener(operations, "client-1")).toBe(0);
    expect(getAmountOfListener(operations, "client-2", true)).toBe(0);

    // Add listeners
    act(() => {
      operations.addListener(jest.fn(), "client-1");
    });

    // Add listener only to the client-1
    expect(getAmountOfListener(operations, "client-1")).toBe(1);
    expect(getAmountOfListener(operations, "client-2", true)).toBe(0);

    act(() => {
      operations.addListener(jest.fn(), "client-2");
    });

    // Then add a new listener to client-2
    expect(getAmountOfListener(operations, "client-1")).toBe(1);
    expect(getAmountOfListener(operations, "client-2", true)).toBe(1);
  });

  it("doesn't trigger global unsubscribe", () => {
    const { result } = renderHook(() =>
      useClient({}, getSandpackStateFromProps({}))
    );
    const operations = result.current[1];

    act(() => {
      operations.registerBundler(document.createElement("iframe"), "client-1");
      operations.registerBundler(document.createElement("iframe"), "client-2");

      operations.runSandpack();
    });

    act(() => {
      operations.addListener(jest.fn());
      operations.addListener(jest.fn());
    });
    const unsubscribe = operations.addListener(jest.fn());

    expect(getAmountOfListener(operations, "client-1")).toBe(3);
    expect(getAmountOfListener(operations, "client-2", true)).toBe(3);

    unsubscribe();

    expect(getAmountOfListener(operations, "client-1")).toBe(2);
    expect(getAmountOfListener(operations, "client-2", true)).toBe(2);
  });

  it("unsubscribe all the listeners from a specific client when it unmonts", () => {
    const { result } = renderHook(() =>
      useClient({}, getSandpackStateFromProps({}))
    );
    const operations = result.current[1];

    act(() => {
      operations.registerBundler(document.createElement("iframe"), "client-1");
      operations.registerBundler(document.createElement("iframe"), "client-2");

      operations.addListener(jest.fn());
      operations.addListener(jest.fn());
      operations.addListener(jest.fn());

      operations.runSandpack();
    });

    expect(getAmountOfListener(operations, "client-1")).toBe(3);
    expect(getAmountOfListener(operations, "client-2", true)).toBe(3);

    act(() => {
      operations.unregisterBundler("client-2");
    });

    expect(getAmountOfListener(operations, "client-1")).toBe(3);
    expect(operations.clients["client-2"]).toBe(undefined);
  });
});
