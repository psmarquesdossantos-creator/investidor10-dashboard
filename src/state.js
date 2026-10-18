/* ========================================
   Investidor10 Dashboard - State Store
   ======================================== */

/**
 * Simple store with getState, dispatch, subscribe.
 * State is a plain object; actions are objects with type and payload.
 * Reducers are pure functions (state, action) => newState.
 */
class Store {
  constructor(initialState, reducers) {
    this._state = { ...initialState };
    this._reducers = reducers || {};
    this._subscribers = new Set();
  }

  getState() {
    return this._state;
  }

  /**
   * Dispatch an action.
   * @param {Object} action - { type: string, payload?: any }
   */
  dispatch(action) {
    if (!action || typeof action !== 'object' || !action.type) {
      throw new Error('Actions must be an object with a type property');
    }
    const reducer = this._reducers[action.type];
    const newState = reducer
      ? reducer(this._state, action)
      : { ...this._state }; // default: shallow copy
    if (newState !== this._state) {
      this._state = newState;
      this._subscribers.forEach(cb => cb());
    }
  }

  subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Listener must be a function');
    }
    this._subscribers.add(listener);
    return () => this._subscribers.delete(listener);
  }
}

/* Default initial state (mirrors MOCK_DATA shape) */
const initialState = {
  // These will be populated from MOCK_DATA or real data
  allTickers: [],
  positions: [],
  entries: [],
  earnings: [],
  monthly: [],
  monthlyData: [],
  patrimony: {},
  allocation: {},
  assetReturns: [],
  kpis: {},
  priceAlerts: [],
  // UI state
  collapsedGroups: new Set(),
  // etc.
};

/* Reducers - handle actions */
const reducers = {
  // Example: SET_POSITIONS
  SET_POSITIONS: (state, action) => ({ ...state, positions: action.payload }),
  SET_ENTRIES: (state, action) => ({ ...state, entries: action.payload }),
  SET_EARNINGS: (state, action) => ({ ...state, earnings: action.payload }),
  SET_MONTHLY: (state, action) => ({ ...state, monthly: action.payload }),
  SET_MONTHLY_DATA: (state, action) => ({ ...state, monthlyData: action.payload }),
  SET_PATRIMONY: (state, action) => ({ ...state, patrimony: action.payload }),
  SET_ALLOCATION: (state, action) => ({ ...state, allocation: action.payload }),
  SET_ASSET_RETURNS: (state, action) => ({ ...state, assetReturns: action.payload }),
  SET_KPIS: (state, action) => ({ ...state, kpis: action.payload }),
  SET_ALL_TICKERS: (state, action) => ({ ...state, allTickers: action.payload }),
  SET_PRICE_ALERTS: (state, action) => ({ ...state, priceAlerts: action.payload }),
  // UI actions
  TOGGLE_GROUP: (state, action) => {
    const collapsed = new Set(state.collapsedGroups);
    if (collapsed.has(action.payload)) {
      collapsed.delete(action.payload);
    } else {
      collapsed.add(action.payload);
    }
    return { ...state, collapsedGroups: collapsed };
  },
  // Add more reducers as needed
};

/* Create store instance */
const store = new Store(initialState, reducers);

/* For backward compatibility, expose a getter that mimics window.MOCK_DATA */
// We'll keep window.MOCK_DATA as a reference to the current state,
// but warn that it should not be mutated directly.
const mockDataProxy = {
  get() {
    return store.getState();
  },
  // To allow setting via window.MOCK_DATA = ... (discouraged)
  set(value) {
    console.warn('window.MOCK_DATA setter called; consider using store.dispatch instead');
    // For compatibility, we replace state entirely (not recommended)
    // This will not trigger subscribers; better to avoid.
    // We'll just assign for now.
    Object.assign(store._state, value);
    store._subscribers.forEach(cb => cb());
  }
};

if (typeof window !== 'undefined') {
  window.MOCK_DATA = mockDataProxy;
}

/* Export store for use in modules */
if (typeof exports !== 'undefined') {
  exports.store = store;
}

// Also expose as a global for debugging if needed
if (typeof window !== 'undefined') {
  window.__STORE__ = store;
}