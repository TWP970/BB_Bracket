// context/ReadOnlyContext.jsx
// Simple context to put entire bracket into read-only mode.
// Wrap any tree with <ReadOnlyProvider> to disable all score inputs.
import { createContext, useContext } from 'react';

const ReadOnlyContext = createContext(false);

export function ReadOnlyProvider({ children }) {
  return <ReadOnlyContext.Provider value={true}>{children}</ReadOnlyContext.Provider>;
}

export function useReadOnly() {
  return useContext(ReadOnlyContext);
}
