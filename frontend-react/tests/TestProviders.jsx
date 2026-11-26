import { useState } from 'react';
import { Provider } from 'react-redux';
import { makeStore } from '../src/store';
import ToastHost from '../src/components/common/ToastHost';

/**
 * What main.jsx gives the real app: a Redux store (created when the test renders, so it picks up the session of
 * the user the test just signed in) and the toast host.
 */
export default function TestProviders({ children }) {
  const [store] = useState(() => makeStore());
  return (
    <Provider store={store}>
      {children}
      <ToastHost />
    </Provider>
  );
}
