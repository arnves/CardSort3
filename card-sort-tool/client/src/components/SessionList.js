import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import axios from 'axios';

const SessionListContainer = styled.div`
  flex: 1;
  padding: 20px;
  border-right: 1px solid #ccc;
  overflow-y: auto; /* Make the session list scrollable */
  max-height: 100vh; /* Ensure it doesn't extend outside the viewport */
`;

const SessionItem = styled.div`
  margin-bottom: 10px;
  padding: 10px;
  border: 1px solid #ccc; /* Add an outline */
  border-radius: 4px; /* Optional: Add rounded corners */
  background-color: #f9f9f9; /* Optional: Add a background color */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* Optional: Add a subtle shadow */
`;

const SessionTitle = styled.h4`
  margin: 0;
`;

const SessionDetails = styled.p`
  margin: 5px 0;
  font-size: 0.9em;
  color: #666;
`;

function SessionList({ token, selectedSessions, onSessionSelect }) {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/sessions`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSessions(response.data);
        console.log('Fetched sessions:', response.data);
      } catch (error) {
        console.error('Error fetching sessions:', error);
      }
    };

    fetchSessions();
  }, [token]);

  useEffect(() => {
    console.log('Selected sessions:', selectedSessions);
  }, [selectedSessions]);

  return (
    <SessionListContainer>
      {sessions.map(session => (
        <SessionItem key={session.id}>
          <SessionTitle>{session.name}</SessionTitle>
          <SessionDetails>Date: {new Date(session.created_datetime).toLocaleString()}</SessionDetails>
          <SessionDetails>Number of cards: {session.card_count}</SessionDetails>
          <SessionDetails>Unsorted: {session.unsorted_count}</SessionDetails>
          <label>
            <input 
              type="checkbox" 
              checked={selectedSessions.includes(session.id)}
              onChange={() => onSessionSelect(session.id)} 
            /> 
            Include in analysis
          </label>
        </SessionItem>
      ))}
    </SessionListContainer>
  );
}

export default SessionList;