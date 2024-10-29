import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import SessionList from './SessionList';
import SessionDataTable from './SessionDataTable';
import axios from 'axios';
import { confirmAlert } from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css';

const DataManagementContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
`;

const SubMenu = styled.div`
  display: flex;
  justify-content: flex-start;
  padding: 10px;
  background-color: #f0f0f0;
`;

const Button = styled.button`
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 1rem;

  &:hover {
    background-color: #0056b3;
  }
`;

const ContentContainer = styled.div`
  display: flex;
  flex-grow: 1;
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
  const [sessions, setSessions] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await axios.get('/api/sessions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessions(response.data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

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
        axios.get(`/api/sessions/${id}`, {
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

  const handleExportData = async () => {
    if (selectedSessions.length === 0) {
      alert("Please select at least one session to export.");
      return;
    }

    try {
      const exportData = [];

      for (const sessionId of selectedSessions) {
        const response = await axios.get(`/api/sessions/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const session = response.data;
        
        // Process unsorted cards
        session.unsortedCards.forEach(card => {
          exportData.push({
            session_id: session.id,
            session_name: session.name,
            card_title: card.title,
            category_name: 'Unsorted'
          });
        });

        // Process categorized cards
        Object.values(session.categories).forEach(category => {
          category.cards.forEach(card => {
            exportData.push({
              session_id: session.id,
              session_name: session.name,
              card_title: card.title,
              category_name: category.name
            });
          });
        });
      }

      // Convert to CSV
      const headers = ['session_id', 'session_name', 'card_title', 'category_name'];
      const csv = [
        headers.join(','),
        ...exportData.map(row => headers.map(field => `"${row[field]}"`).join(','))
      ].join('\n');

      // Create and download CSV file
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `sessions_export_${new Date().toISOString()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  const handleDeleteSessions = () => {
    if (selectedSessions.length === 0) {
      alert("Please select at least one session to delete.");
      return;
    }

    const sessionNames = sessions
      .filter(session => selectedSessions.includes(session.id))
      .map(session => session.name)
      .join(', ');

    confirmAlert({
      title: 'Confirm to delete',
      message: `Are you sure you want to delete the following sessions: ${sessionNames}?`,
      buttons: [
        {
          label: 'Yes',
          onClick: async () => {
            try {
              await Promise.all(selectedSessions.map(sessionId =>
                axios.delete(`/api/sessions/${sessionId}`, {
                  headers: { Authorization: `Bearer ${token}` }
                })
              ));
              alert('Sessions deleted successfully.');
              setSelectedSessions([]);
              setRefreshTrigger(prev => prev + 1);
              setTableData([]);
            } catch (error) {
              console.error('Error deleting sessions:', error);
              alert('Failed to delete sessions. Please try again.');
            }
          }
        },
        {
          label: 'No'
        }
      ]
    });
  };

  return (
    <DataManagementContainer>
      <SubMenu>
        <Button onClick={handleExportData}>Export Data</Button>
        <Button onClick={handleDeleteSessions}>Delete Sessions</Button>
      </SubMenu>
      <ContentContainer>
        <SessionListContainer>
          <SessionList 
            token={token}
            selectedSessions={selectedSessions}
            onSessionSelect={handleSessionSelect}
            refreshTrigger={refreshTrigger}
          />
        </SessionListContainer>
        <TableContainer>
          <SessionDataTable data={tableData} token={token} />
        </TableContainer>
      </ContentContainer>
    </DataManagementContainer>
  );
}

export default DataManagement;