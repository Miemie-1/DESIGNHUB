import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PasswordInput from '@/components/PasswordInput';
import ConfirmDialog from '@/components/ConfirmDialog';
import ThemeToggle from '@/components/ThemeToggle';
import { PageLoading, RowsLoading } from '@/components/Loading';

describe('PasswordInput', () => {
  it('toggles visibility and forwards props', async () => {
    render(<PasswordInput placeholder="pw" required />);
    const input = screen.getByPlaceholderText('pw');
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toBeRequired();

    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');
    const hide = screen.getByRole('button', { name: 'Hide password' });
    expect(hide).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(hide);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('never overrides type with a caller-supplied one', () => {
    render(<PasswordInput type="text" placeholder="pw" />);
    expect(screen.getByPlaceholderText('pw')).toHaveAttribute('type', 'password');
  });
});

describe('ConfirmDialog', () => {
  const base = { title: 'Delete client?', message: 'This cannot be undone.' };
  const setup = (props = {}) => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const ui = (p) => <ConfirmDialog open {...base} onConfirm={onConfirm} onCancel={onCancel} {...p} />;
    const utils = render(ui(props));
    return { onConfirm, onCancel, ui, ...utils };
  };

  it('opens as a modal when `open` and shows title/message', () => {
    setup();
    expect(document.querySelector('dialog')).toHaveAttribute('open');
    expect(screen.getByText('Delete client?')).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
  });

  it('stays closed when not open, and follows `open` changes', () => {
    const { rerender, ui } = setup({ open: false });
    const dialog = document.querySelector('dialog');
    expect(dialog).not.toHaveAttribute('open');
    rerender(ui({ open: true }));
    expect(dialog).toHaveAttribute('open');
    rerender(ui({ open: false }));
    expect(dialog).not.toHaveAttribute('open');
  });

  it('calls onConfirm / onCancel from the buttons', async () => {
    const { onConfirm, onCancel } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Delete', hidden: true }));
    expect(onConfirm).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel', hidden: true }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('disables both buttons and shows progress while busy', () => {
    setup({ busy: true });
    expect(screen.getByRole('button', { name: 'Deleting…', hidden: true })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel', hidden: true })).toBeDisabled();
  });

  it('supports a custom confirm label', () => {
    setup({ confirmLabel: 'Remove' });
    expect(screen.getByRole('button', { name: 'Remove', hidden: true })).toBeInTheDocument();
  });

  it('Esc (cancel event) calls onCancel instead of closing natively; backdrop click cancels', async () => {
    const { onCancel } = setup();
    const dialog = document.querySelector('dialog');
    const evt = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(evt);
    expect(evt.defaultPrevented).toBe(true);
    expect(onCancel).toHaveBeenCalledTimes(1);

    await userEvent.click(dialog); // a click on the dialog element itself = the backdrop
    expect(onCancel).toHaveBeenCalledTimes(2);
  });
});

describe('ThemeToggle', () => {
  afterEach(() => delete document.documentElement.dataset.theme);

  it('reflects the current theme and toggles it', async () => {
    document.documentElement.dataset.theme = 'light';
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('designhub_theme')).toBe('dark');
    await userEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});

describe('Loading', () => {
  it('PageLoading is announced as busy', () => {
    render(<PageLoading />);
    expect(screen.getByLabelText('Loading')).toHaveAttribute('aria-busy', 'true');
  });

  it('RowsLoading renders the requested number of skeleton rows', () => {
    const { container } = render(
      <table>
        <tbody>
          <RowsLoading colSpan={5} rows={3} />
        </tbody>
      </table>
    );
    expect(container.querySelectorAll('tr')).toHaveLength(3);
    expect(container.querySelector('td')).toHaveAttribute('colspan', '5');
  });
});
