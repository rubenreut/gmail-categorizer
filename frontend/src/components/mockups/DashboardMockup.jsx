import React from 'react';
import './DashboardMockup.css';

const DashboardMockup = () => {
  // Mockup data
  const categories = [
    { id: 'cat1', name: 'Primary', unread: 7, color: '#4285f4', icon: 'inbox' },
    { id: 'cat2', name: 'Social', unread: 3, color: '#ea4335', icon: 'people' },
    { id: 'cat3', name: 'Promotions', unread: 15, color: '#34a853', icon: 'local_offer' },
    { id: 'cat4', name: 'Updates', unread: 2, color: '#fbbc04', icon: 'info' },
    { id: 'cat5', name: 'Forums', unread: 0, color: '#673ab7', icon: 'forum' },
    { id: 'cat6', name: 'Work', unread: 5, color: '#0097a7', icon: 'work' },
    { id: 'cat7', name: 'Travel', unread: 1, color: '#f06292', icon: 'flight' },
  ];
  
  const emails = [
    {
      id: 'email1',
      from: 'GitHub',
      subject: 'New pull request in gmail-categorizer',
      preview: 'Feature: Added AI categorization for new emails',
      time: '10:45 AM',
      isRead: false,
      isStarred: true,
      hasAttachments: false,
      category: 'Updates'
    },
    {
      id: 'email2',
      from: 'Jane Smith',
      subject: 'Project timeline update',
      preview: 'Hi, I\'ve updated the project timeline with the new milestones we discussed yesterday.',
      time: '9:30 AM',
      isRead: false,
      isStarred: false,
      hasAttachments: true,
      category: 'Work'
    },
    {
      id: 'email3',
      from: 'LinkedIn',
      subject: 'New connection request',
      preview: 'John Doe wants to connect with you on LinkedIn',
      time: 'Yesterday',
      isRead: true,
      isStarred: false,
      hasAttachments: false,
      category: 'Social'
    },
    {
      id: 'email4',
      from: 'Amazon',
      subject: 'Your order has shipped',
      preview: 'Your recent order #123-456789 has shipped and is on its way.',
      time: 'Yesterday',
      isRead: true,
      isStarred: false,
      hasAttachments: false,
      category: 'Updates'
    },
    {
      id: 'email5',
      from: 'Delta Airlines',
      subject: 'Flight confirmation: NYC to SFO',
      preview: 'Thank you for your booking. Your flight confirmation is attached.',
      time: 'May 15',
      isRead: true,
      isStarred: true,
      hasAttachments: true,
      category: 'Travel'
    }
  ];
  
  return (
    <div className="dashboard-mockup">
      <header className="dashboard-header">
        <div className="brand">
          <svg className="logo" width="24" height="24" viewBox="0 0 24 24">
            <path d="M20,4H4C2.9,4,2,4.9,2,6v12c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2V6C22,4.9,21.1,4,20,4z M20,8l### /frontend/src/components/mockups/DashboardMockup.jsx (continued)
