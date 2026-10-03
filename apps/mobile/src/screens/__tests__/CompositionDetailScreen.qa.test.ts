import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Composition } from '@toposonics/types';
import CompositionDetailScreen from '../CompositionDetailScreen';

const mocks = vi.hoisted(() => ({
  auth: { token: 'qa-session-a', user: { id: 'qa-user-a' }, loading: false } as {
    token: string | null; user: { id: string } | null; loading: boolean;
  },
  loadComposition: vi.fn(),
  removeComposition: vi.fn(),
  alert: vi.fn(),
  goBack: vi.fn(),
  playNoteEvents: vi.fn(),
}));

vi.mock('react-native', () => ({
  View: 'View', Text: 'Text', ActivityIndicator: 'ActivityIndicator',
  ScrollView: 'ScrollView', TouchableOpacity: 'TouchableOpacity',
  StyleSheet: { create: (styles: unknown) => styles },
  Alert: { alert: mocks.alert },
}));
vi.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: mocks.goBack }) }));
vi.mock('../../auth/AuthProvider', () => ({ useAuth: () => mocks.auth }));
vi.mock('../../state/CompositionsProvider', () => ({
  useCompositions: () => ({
    loadComposition: mocks.loadComposition, removeComposition: mocks.removeComposition,
  }),
}));
vi.mock('../../services/audioPlayer', () => ({
  playNoteEvents: mocks.playNoteEvents, formatNoteEventsDuration: () => 1,
}));
vi.mock('../../components/SignInModal', () => ({ SignInModal: () => null }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function composition(id: string): Composition {
  return {
    id, userId: 'qa-user-a', title: id, mappingMode: 'LINEAR_LANDSCAPE', key: 'C',
    scale: 'C_MAJOR', noteEvents: [],
    createdAt: new Date('2026-10-02T00:00:00Z'), updatedAt: new Date('2026-10-02T00:00:00Z'),
  };
}

let renderer: ReactTestRenderer | undefined;
const tree = (id = 'qa-detail') => React.createElement(CompositionDetailScreen, {
  route: { key: 'qa-route', name: 'CompositionDetail', params: { id } },
});
const rendered = () => JSON.stringify(renderer!.toJSON());

async function mount() {
  await act(async () => { renderer = create(tree()); });
}

async function switchAccount() {
  mocks.auth = { token: 'qa-session-b', user: { id: 'qa-user-b' }, loading: false };
  await act(async () => { renderer!.update(tree()); });
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.resetAllMocks();
  mocks.auth = { token: 'qa-session-a', user: { id: 'qa-user-a' }, loading: false };
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(async () => {
  if (renderer) await act(async () => { renderer!.unmount(); });
  renderer = undefined;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('QA mobile composition detail session isolation', () => {
  it('FE-002: clears the previous account record while replacement detail loads', async () => {
    mocks.loadComposition.mockResolvedValueOnce(composition('a-private'));
    await mount();
    expect(rendered()).toContain('a-private');
    const replacement = deferred<Composition | null>();
    mocks.loadComposition.mockReturnValueOnce(replacement.promise);
    await switchAccount();
    expect(rendered()).not.toContain('a-private');
    expect(rendered()).toContain('ActivityIndicator');
    await act(async () => { replacement.resolve(null); });
    expect(rendered()).toContain('Composition not found');
    expect(rendered()).not.toContain('a-private');
  });

  it.each(['success', 'null', 'failure'] as const)(
    'FE-002: ignores stale %s detail completion without changing the new loading state',
    async (outcome) => {
      const old = deferred<Composition | null>();
      const replacement = deferred<Composition | null>();
      mocks.loadComposition.mockReturnValueOnce(old.promise).mockReturnValueOnce(replacement.promise);
      await mount();
      await switchAccount();
      await act(async () => {
        if (outcome === 'failure') old.reject(new Error('Stale request'));
        else old.resolve(outcome === 'success' ? composition('a-private') : null);
      });
      expect(mocks.alert).not.toHaveBeenCalled();
      expect(rendered()).toContain('ActivityIndicator');
      expect(rendered()).not.toContain('a-private');
      await act(async () => { replacement.resolve(composition('b-private')); });
      expect(rendered()).toContain('b-private');
    }
  );

  it.each(['user', 'token', 'route'] as const)(
    'FE-002: invalidates detail requests when the %s changes',
    async (change) => {
      const old = deferred<Composition | null>();
      mocks.loadComposition.mockReturnValueOnce(old.promise)
        .mockResolvedValueOnce(composition('new-private'));
      await mount();
      if (change === 'user') mocks.auth = { ...mocks.auth, user: { id: 'qa-user-b' } };
      if (change === 'token') mocks.auth = { ...mocks.auth, token: 'qa-session-new' };
      await act(async () => { renderer!.update(tree(change === 'route' ? 'new-route' : 'qa-detail')); });
      await act(async () => { old.resolve(composition('a-private')); });
      expect(rendered()).toContain('new-private');
      expect(rendered()).not.toContain('a-private');
    }
  );

  it('FE-002: ignores rejected detail requests after unmount', async () => {
    const old = deferred<Composition | null>();
    mocks.loadComposition.mockReturnValueOnce(old.promise);
    await mount();
    await act(async () => { renderer!.unmount(); });
    renderer = undefined;
    await act(async () => { old.reject(new Error('Stale unmounted request')); });
    expect(mocks.alert).not.toHaveBeenCalled();
  });

  it('FE-002: stops previous account playback when switching accounts', async () => {
    const playback = deferred<void>();
    const cancel = vi.fn(() => playback.resolve());
    mocks.playNoteEvents.mockReturnValue({ cancel, done: playback.promise });
    mocks.loadComposition.mockResolvedValueOnce(composition('a-private'))
      .mockResolvedValueOnce(composition('b-private'));
    await mount();
    const play = renderer!.root.findAllByType('TouchableOpacity' as React.ElementType)[0];
    await act(async () => { void play.props.onPress(); });
    await switchAccount();
    expect(cancel).toHaveBeenCalledOnce();
    expect(rendered()).toContain('b-private');
    expect(rendered()).toContain('Play Composition');
  });
  it.each(['success', 'failure'] as const)(
    'FE-002: ignores a previous account delete %s after an account switch',
    async (outcome) => {
      const deletion = deferred<void>();
      mocks.loadComposition.mockResolvedValueOnce(composition('a-private'))
        .mockResolvedValueOnce(composition('b-private'));
      mocks.removeComposition.mockReturnValue(deletion.promise);
      await mount();
      const remove = renderer!.root.findAllByType('TouchableOpacity' as React.ElementType)[1];
      await act(async () => { remove.props.onPress(); });
      const confirm = mocks.alert.mock.calls.at(-1)![2][1].onPress;
      await act(async () => { void confirm(); });
      await switchAccount();
      mocks.alert.mockClear();
      await act(async () => {
        if (outcome === 'failure') deletion.reject(new Error('Old delete failure'));
        else deletion.resolve();
      });
      expect(mocks.goBack).not.toHaveBeenCalled();
      expect(mocks.alert).not.toHaveBeenCalled();
      expect(rendered()).toContain('b-private');
      expect(rendered()).not.toContain('Deleting');
    }
  );

  it('FE-002: ignores a previous account delete confirmation after switching accounts', async () => {
    mocks.loadComposition.mockResolvedValueOnce(composition('a-private'))
      .mockResolvedValueOnce(composition('b-private'));
    await mount();
    const remove = renderer!.root.findAllByType('TouchableOpacity' as React.ElementType)[1];
    await act(async () => { remove.props.onPress(); });
    const confirm = mocks.alert.mock.calls.at(-1)![2][1].onPress;
    await switchAccount();
    await act(async () => { await confirm(); });
    expect(mocks.removeComposition).not.toHaveBeenCalled();
    expect(mocks.goBack).not.toHaveBeenCalled();
  });

});
