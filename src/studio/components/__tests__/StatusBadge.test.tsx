import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  StatusBadge,
  STATUS_THEME,
  type Status,
} from '@/studio/components/StatusBadge';

describe('StatusBadge', () => {
  (Object.keys(STATUS_THEME) as Status[]).forEach((status) => {
    it(`${status} 状态渲染类名正确`, () => {
      const { getByText } = render(<StatusBadge status={status} />);
      const wrapper = getByText(status) as HTMLElement;
      expect(wrapper.className).toContain(STATUS_THEME[status].bg);
      expect(wrapper.className).toContain(STATUS_THEME[status].text);
      const dot = wrapper.querySelector('span');
      expect(dot?.className).toContain(STATUS_THEME[status].dot);
    });
  });
});

