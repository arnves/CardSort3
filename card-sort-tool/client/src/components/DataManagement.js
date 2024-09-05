import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import SessionList from './SessionList';
import SessionDataTable from './SessionDataTable';
import axios from 'axios';

const DataManagementContainer = styled.div`
  display: flex;
  height: calc(100vh - 120px); // Adjust based on your header and stage bar height
`;

const SessionListContainer = styled.div`
  width: 250px;
  border-right: 1px solid #ccc;
  overflow-y: auto;
`;

const TableContainer = styled.div`
  flex-grow: 1;
  overflow: auto;
`;

function DataManagement({ token }) {
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [tableData, setTableData] = useState([]);

  useEffect(() => {
    if (selectedSessions.length > 0) {
      fetchSessionData(selectedSessions);
    } else {
      setTableData([]);
    }
  }, [selectedSessions]);

  const fetchSessionData = async (sessionIds) => {
    try {
      const sessionDataPromises = sessionIds.map(id => 
        axios.get(`${process.env.REACT_APP_API_URL}/sessions/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );

      const sessionResponses = await Promise.all(sessionDataPromises);
      
      const flattenedData = sessionResponses.flatMap(response => {
        const session = response.data;
        const sessionName = session.name;

        const unsortedCards = session.unsortedCards.map(card => ({
          sessionId: session.id,
          sessionName,
          cardId: card.id,
          cardTitle: card.title,
          cardContent: card.text,
          categoryName: 'Unsorted'
        }));

        const categorizedCards = Object.values(session.categories).flatMap(category =>
          category.cards.map(card => ({
            sessionId: session.id,
            sessionName,
            cardId: card.id,
            cardTitle: card.title,
            cardContent: card.text,
            categoryName: category.name
          }))
        );

        return [...unsortedCards, ...categorizedCards];
      });

      setTableData(flattenedData);
    } catch (error) {
      console.error('Error fetching session data:', error);
    }
  };

  const handleSessionSelect = (sessionId) => {
    setSelectedSessions(prev => 
      prev.includes(sessionId) 
        ? prev.filter(id => id !== sessionId)
        : [...prev, sessionId]
    );
  };

  return (
    <DataManagementContainer>
      <SessionListContainer>
        <SessionList 
          token={token}
          selectedSessions={selectedSessions}
          onSessionSelect={handleSessionSelect}
        />
      </SessionListContainer>
      <TableContainer>
        <SessionDataTable data={tableData} token={token} />
      </TableContainer>
    </DataManagementContainer>
  );
}

export default DataManagement;