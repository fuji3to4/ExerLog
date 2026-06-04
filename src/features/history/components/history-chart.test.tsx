import { render, screen } from '@testing-library/react';
import { HistoryChart } from './history-chart';
import type { GraphSeries } from './history-graph-query';

describe('HistoryChart', () => {
  const mockData: GraphSeries[] = [
    { name: '1620000000000', value: 150 },
    { name: '1620134400000', value: 200 },
    { name: '1620220800000', value: 175 },
  ];

  it('レンダリングが正常に行われること', () => {
    render(<HistoryChart data={mockData} />);

    const chartContainer = screen.getByTestId('history-chart');
    expect(chartContainer).toBeInTheDocument();
  });

  it('データポイントが正しく表示されること', () => {
    render(<HistoryChart data={mockData} />);

    // データポイントの存在を確認
    for (const point of mockData) {
      // 日付の変換を検証
      const dateLabel = screen.queryByText(
        new Date(+point.name).toLocaleDateString('ja-JP')
      );

      // 価格ラベルが少なくとも1つは表示されていること
      const priceLabel = screen.queryByText(`¥${point.value}`);

      expect(dateLabel || priceLabel).toBeInTheDocument();
    }
  });

  it('カスタムツールチップが表示されること', () => {
    render(<HistoryChart data={mockData} />);

    // ツールチップ要素を検証
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });
});