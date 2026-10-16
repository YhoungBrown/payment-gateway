import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { HomeScreen } from '..';

describe('HomeScreen', () => {
  it('renders correctly', async () => {
    await ReactTestRenderer.act(() => {
      ReactTestRenderer.create(
        <HomeScreen
          safeAreaInsets={{ top: 0, bottom: 0, left: 0, right: 0 }}
        />,
      );
    });
  });
});
