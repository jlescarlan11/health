import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MultiSelectChecklist } from '../src/components/common/MultiSelectChecklist';
import { theme } from '../src/theme';
import { PaperProvider } from 'react-native-paper';

const renderWithTheme = (component: React.ReactElement) => {
  return render(<PaperProvider theme={theme}>{component}</PaperProvider>);
};

const options = [
  { id: '1', label: 'Option 1' },
  { id: '2', label: 'Option 2' },
  { id: '3', label: 'Option 3' },
];

describe('MultiSelectChecklist', () => {
  it('renders correctly with given options', () => {
    const { getByLabelText } = renderWithTheme(
      <MultiSelectChecklist options={options} selectedIds={[]} onSelectionChange={() => {}} />,
    );

    expect(getByLabelText('Option 1')).toBeTruthy();
    expect(getByLabelText('Option 2')).toBeTruthy();
    expect(getByLabelText('Option 3')).toBeTruthy();
  });

  it('renders title in uppercase when provided', () => {
    const { getByText } = renderWithTheme(
      <MultiSelectChecklist
        options={options}
        selectedIds={[]}
        onSelectionChange={() => {}}
        title="Select options"
      />,
    );

    expect(getByText('SELECT OPTIONS')).toBeTruthy();
  });

  it('calls onSelectionChange with new id when unselected option is pressed', () => {
    const onSelectionChange = jest.fn();
    const { getByLabelText } = renderWithTheme(
      <MultiSelectChecklist
        options={options}
        selectedIds={['2']}
        onSelectionChange={onSelectionChange}
      />,
    );

    fireEvent.press(getByLabelText('Option 1'));
    expect(onSelectionChange).toHaveBeenCalledWith(['2', '1']);
  });

  it('calls onSelectionChange with id removed when selected option is pressed', () => {
    const onSelectionChange = jest.fn();
    const { getByLabelText } = renderWithTheme(
      <MultiSelectChecklist
        options={options}
        selectedIds={['1', '2']}
        onSelectionChange={onSelectionChange}
      />,
    );

    fireEvent.press(getByLabelText('Option 1'));
    expect(onSelectionChange).toHaveBeenCalledWith(['2']);
  });

  it('works in singleSelection mode', () => {
    const onSelectionChange = jest.fn();
    const { getByLabelText } = renderWithTheme(
      <MultiSelectChecklist
        options={options}
        selectedIds={['1']}
        onSelectionChange={onSelectionChange}
        singleSelection={true}
      />,
    );

    fireEvent.press(getByLabelText('Option 2'));
    expect(onSelectionChange).toHaveBeenCalledWith(['2']);
  });

  it('renders grouped options correctly', () => {
    const groupedOptions = [
      {
        category: 'Group A',
        items: [
          { id: 'a1', label: 'Option A1' },
          { id: 'a2', label: 'Option A2' },
        ],
      },
      {
        category: 'Group B',
        items: [{ id: 'b1', label: 'Option B1' }],
      },
    ];

    const { getByText, getByLabelText } = renderWithTheme(
      <MultiSelectChecklist
        options={groupedOptions}
        selectedIds={[]}
        onSelectionChange={() => {}}
      />,
    );

    expect(getByText('Group A')).toBeTruthy();
    expect(getByText('Group B')).toBeTruthy();
    expect(getByLabelText('Option A1')).toBeTruthy();
    expect(getByLabelText('Option B1')).toBeTruthy();
  });
});
