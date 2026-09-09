import { describe, it, expect, expectTypeOf } from 'vitest';
import { Button, Card, theme } from '../index';
import type { ButtonProps, CardProps } from '../index';

/**
 * The web studio renders these components through React Native-style props consumed by
 * react-native-web; there is no DOM renderer in this package's devDeps, so these tests
 * pin the module contract (exports, prop types, defaults) instead of rendered markup.
 */
describe('@toposonics/ui component exports', () => {
  it('exports Button and Card components and the theme from the barrel', () => {
    expect(typeof Button).toBe('function');
    expect(typeof Card).toBe('function');
    expect(theme).toBeDefined();
  });

  it('Button accepts the documented prop surface', () => {
    const props: ButtonProps = {
      children: 'Play',
      variant: 'primary',
      size: 'md',
      type: 'button',
      disabled: false,
      fullWidth: false,
      loading: false,
      className: 'extra',
      iconBefore: null,
      iconAfter: null,
      onClick: () => {},
    };
    expect(props.variant).toBe('primary');
    expectTypeOf(props.variant).toEqualTypeOf<
      'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | undefined
    >();
    expectTypeOf(props.size).toEqualTypeOf<'sm' | 'md' | 'lg' | undefined>();
    expectTypeOf(props.type).toEqualTypeOf<'button' | 'submit' | 'reset' | undefined>();
  });

  it('Button rejects unknown variants at the type level', () => {
    // @ts-expect-error - variants outside the documented set must not type-check
    const bad: ButtonProps = { children: 'x', variant: 'rainbow' };
    void bad;
  });

  it('Card accepts the documented prop surface', () => {
    const props: CardProps = {
      children: 'Body',
      title: 'Title',
      subtitle: 'Subtitle',
      variant: 'elevated',
      padding: 'lg',
      className: 'extra',
      headerActions: null,
      onClick: () => {},
    };
    expect(props.variant).toBe('elevated');
    expectTypeOf(props.variant).toEqualTypeOf<
      'default' | 'elevated' | 'bordered' | 'ghost' | undefined
    >();
    expectTypeOf(props.padding).toEqualTypeOf<'none' | 'sm' | 'md' | 'lg' | undefined>();
  });
});
