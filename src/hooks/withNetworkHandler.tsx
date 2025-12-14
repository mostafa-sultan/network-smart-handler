import type { ComponentType } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import type { NetworkContextValue } from '../context/NetworkContext';

/**
 * Higher-Order Component to inject network handler props
 */
export function withNetworkHandler<P extends object>(
  Component: ComponentType<P & NetworkContextValue>
): ComponentType<P> {
  return function WithNetworkHandlerComponent(props: P) {
    const networkProps = useNetworkStatus();
    return <Component {...props} {...networkProps} />;
  };
}
