import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Composition } from '@toposonics/types';
import CompositionDetailScreen from '../CompositionDetailScreen';
import { CompositionsProvider } from '../../state/CompositionsProvider';

const mocks = vi.hoisted(() => ({
  auth: { token: 'qa-session-a', user: { id: 'qa-user-a' }, loading: false },
  storage: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
  api: {
    fetchComposition: vi.fn(), fetchAllCompositions: vi.fn(),
    createComposition: vi.fn(), deleteComposition: vi.fn(),
  },
  alert: vi.fn(),
}));

vi.mock('react-native', () => ({
  View: 'View', Text: 'Text', ActivityIndicator: 'ActivityIndicator',
  ScrollView: 'ScrollView', TouchableOpacity: 'TouchableOpacity',
  StyleSheet: { create: (styles: unknown) => styles },
  Alert: { alert: mocks.alert },
}));
vi.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: vi.fn() }) }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: mocks.storage }));
vi.mock('../../auth/AuthProvider', () => ({ useAuth: () => mocks.auth }));
vi.mock('../../services/apiClient', () => mocks.api);
vi.mock('../../services/audioPlayer', () => ({
  playNoteEvents: vi.fn(), formatNoteEventsDuration: () => 1,
}));
vi.mock('../../components/SignInModal', () => ({ SignInModal: () => null }));

function composition(userId: string): Composition {
  return {
    id: 'qa-detail', userId, title: `${userId}-private`,
    mappingMode: 'LINEAR_LANDSCAPE', key: 'C', scale: 'C_MAJOR', noteEvents: [],
    createdAt: new Date('2026-10-02T00:00:00Z'), updatedAt: new Date('2026-10-02T00:00:00Z'),
  };
}

let renderer: ReactTestRenderer | undefined;
const tree = () => React.createElement(CompositionsProvider, null,
  React.createElement(CompositionDetailScreen, {
    route: { key: 'qa-route', name: 'CompositionDetail', params: { id: 'qa-detail' } },
  })
);

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.resetAllMocks();
  mocks.auth = { token: 'qa-session-a', user: { id: 'qa-user-a' }, loading: false };
  mocks.api.fetchAllCompositions.mockResolvedValue([]);
  mocks.storage.getItem.mockResolvedValue(null);
  mocks.storage.setItem.mockResolvedValue(undefined);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(async () => {
  if (renderer) await act(async () => { renderer!.unmount(); });
  renderer = undefined;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('FE-002: the real detail screen loads the new account after the provider changes sessions', async () => {
  mocks.api.fetchComposition.mockResolvedValueOnce(composition('qa-user-a'));
  await act(async () => { renderer = create(tree()); });
  expect(JSON.stringify(renderer!.toJSON())).toContain('qa-user-a-private');

  mocks.auth = { token: 'qa-session-b', user: { id: 'qa-user-b' }, loading: false };
  mocks.api.fetchComposition.mockResolvedValueOnce(composition('qa-user-b'));
  await act(async () => { renderer!.update(tree()); });

  expect(mocks.api.fetchComposition).toHaveBeenCalledTimes(2);
  expect(JSON.stringify(renderer!.toJSON())).toContain('qa-user-b-private');
  expect(JSON.stringify(renderer!.toJSON())).not.toContain('qa-user-a-private');
  expect(mocks.alert).not.toHaveBeenCalled();
});
