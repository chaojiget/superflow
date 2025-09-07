import { render, screen } from '@testing-library/react';
import App from '../App';

describe('App', () => {
  it('页面能够渲染', () => {
    render(<App />);
    expect(screen.getByText('工作流编排 Studio').outerHTML).toMatchSnapshot();
  });
});
