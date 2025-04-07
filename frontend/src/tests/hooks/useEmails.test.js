import { renderHook, act } from '@testing-library/react-hooks';
import { EmailContext } from '../../contexts/EmailContext';
import { useEmails } from '../../hooks/useEmails';
import { emailService } from '../../services/emailService';

// Mock the email service
jest.mock('../../services/emailService');

// Sample data
const mockEmails = [
  {
    _id: 'email1',
    subject: 'Test Email 1',
    from: { name: 'Sender 1', email: 'sender1@example.com' },
    isRead: false,
    categories: ['cat1'],
    receivedAt: new Date().toISOString()
  },
  {
    _id: 'email2',
    subject: 'Test Email 2',
    from: { name: 'Sender 2', email: 'sender2@example.com' },
    isRead: true,
    categories: ['cat2'],
    receivedAt: new Date().toISOString()
  }
];

const mockEmailContext = {
  emails: mockEmails,
  setEmails: jest.fn(),
  selectedEmail: null,
  setSelectedEmail: jest.fn(),
  unreadCount: 1,
  setUnreadCount: jest.fn()
};

describe('useEmails Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('returns the correct initial state', () => {
    const wrapper = ({ children }) => (
      <EmailContext.Provider value={mockEmailContext}>
        {children}
      </EmailContext.Provider>
    );
    
    const { result } = renderHook(() => useEmails(), { wrapper });
    
    expect(result.current.emails).toEqual(mockEmails);
    expect(result.current.selectedEmail).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.unreadCount).toBe(1);
  });
  
  test('fetchEmails calls the email service and updates state', async () => {
    emailService.getEmails.mockResolvedValue({
      data: {
        data: mockEmails
      }
    });
    
    const wrapper = ({ children }) => (
      <EmailContext.Provider value={mockEmailContext}>
        {children}
      </EmailContext.Provider>
    );
    
    const { result, waitForNextUpdate } = renderHook(() => useEmails(), { wrapper });
    
    act(() => {
      result.current.fetchEmails();
    });
    
    expect(result.current.loading).toBe(true);
    
    await waitForNextUpdate();
    
    expect(emailService.getEmails).toHaveBeenCalled();
    expect(mockEmailContext.setEmails).toHaveBeenCalledWith(mockEmails);
    expect(result.current.loading).toBe(false);
  });
  
  test('getEmailById fetches a single email', async () => {
    const singleEmail = mockEmails[0];
    
    emailService.getEmailById.mockResolvedValue({
      data: {
        data: singleEmail
      }
    });
    
    const wrapper = ({ children }) => (
      <EmailContext.Provider value={mockEmailContext}>
        {children}
      </EmailContext.Provider>
    );
    
    const { result, waitForNextUpdate } = renderHook(() => useEmails(), { wrapper });
    
    act(() => {
      result.current.getEmailById('email1');
    });
    
    expect(result.current.loading).toBe(true);
    
    await waitForNextUpdate();
    
    expect(emailService.getEmailById).toHaveBeenCalledWith('email1');
    expect(mockEmailContext.setSelectedEmail).toHaveBeenCalledWith(singleEmail);
    expect(result.current.loading).toBe(false);
  });
  
  test('markAsRead updates the email read status', async () => {
    emailService.markAsRead.mockResolvedValue({
      data: {
        success: true
      }
    });
    
    const wrapper = ({ children }) => (
      <EmailContext.Provider value={mockEmailContext}>
        {children}
      </EmailContext.Provider>
    );
    
    const { result, waitForNextUpdate } = renderHook(() => useEmails(), { wrapper });
    
    act(() => {
      result.current.markAsRead('email1');
    });
    
    await waitForNextUpdate();
    
    expect(emailService.markAsRead).toHaveBeenCalledWith('email1');
    expect(mockEmailContext.setEmails).toHaveBeenCalled();
    expect(mockEmailContext.setUnreadCount).toHaveBeenCalled();
  });
  
  test('handles errors correctly', async () => {
    emailService.getEmails.mockRejectedValue(new Error('Failed to fetch emails'));
    
    const wrapper = ({ children }) => (
      <EmailContext.Provider value={mockEmailContext}>
        {children}
      </EmailContext.Provider>
    );
    
    const { result, waitForNextUpdate } = renderHook(() => useEmails(), { wrapper });
    
    act(() => {
      result.current.fetchEmails();
    });
    
    await waitForNextUpdate();
    
    expect(result.current.error).toBe('Failed to fetch emails');
    expect(result.current.loading).toBe(false);
  });
});
