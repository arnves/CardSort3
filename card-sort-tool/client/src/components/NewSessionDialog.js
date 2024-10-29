import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { FaRandom, FaCopy } from 'react-icons/fa';

const DialogOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const DialogContent = styled.div`
  background-color: white;
  padding: 20px;
  border-radius: 5px;
  width: 400px;
`;

const Input = styled.input`
  width: 100%;
  padding: 5px;
  margin-bottom: 10px;
`;

const Button = styled.button`
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  margin-right: 10px;
  cursor: pointer;

  &:hover {
    background-color: #0056b3;
  }
`;

const CancelButton = styled(Button)`
  background-color: #6c757d;

  &:hover {
    background-color: #545b62;
  }
`;

const RandomizeIcon = styled(FaRandom)`
  margin-right: 5px;
`;

const RandomizeContainer = styled.div`
  display: flex;
  align-items: center;
  margin-top: 10px;
  margin-bottom: 10px;
`;

const PercentageInput = styled.input`
  width: 50px;
  margin-left: 10px;
`;

const TabContainer = styled.div`
  margin-bottom: 20px;
`;

const TabButton = styled.button`
  padding: 8px 16px;
  margin-right: 10px;
  background-color: ${props => props.$active ? '#007bff' : '#e9ecef'};
  color: ${props => props.$active ? 'white' : 'black'};
  border: none;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background-color: ${props => props.$active ? '#0056b3' : '#dee2e6'};
  }
`;

const TabContent = styled.div`
  margin-top: 20px;
  padding: 10px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
`;

const Select = styled.select`
  width: 100%;
  padding: 8px;
  margin-bottom: 10px;
  border-radius: 4px;
  border: 1px solid #ced4da;
`;

function generateSessionName() {
  const base = "Session ";
  const randomPart = Math.random().toString(36).substring(2, 9).toUpperCase();
  return base + randomPart;
}

function NewSessionDialog({ token, selectedCardSets, setSelectedCardSets, onConfirm, onCancel }) {
  const [sessionName, setSessionName] = useState(generateSessionName());
  const [cardSets, setCardSets] = useState([]);
  const [existingSessions, setExistingSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [randomizeOrder, setRandomizeOrder] = useState(false);
  const [randomPercentage, setRandomPercentage] = useState(100);
  const [activeTab, setActiveTab] = useState('cardSets'); // 'cardSets' or 'copy'
  const [selectedSession, setSelectedSession] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cardSetsResponse, sessionsResponse] = await Promise.all([
          axios.get('/api/card-sets', {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true
          }),
          axios.get('/api/sessions', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        
        setCardSets(cardSetsResponse.data);
        setExistingSessions(sessionsResponse.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Error fetching data. Please try again.');
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const handleCardSetToggle = (cardSetId) => {
    if (selectedCardSets.includes(cardSetId)) {
      setSelectedCardSets(selectedCardSets.filter(id => id !== cardSetId));
    } else {
      setSelectedCardSets([...selectedCardSets, cardSetId]);
    }
  };

  const handleConfirm = async () => {
    if (activeTab === 'copy' && !selectedSession) {
      alert('Please select a session to copy');
      return;
    }

    if (activeTab === 'cardSets') {
      onConfirm({
        name: sessionName,
        randomizeOrder,
        randomPercentage
      }, false);
    } else {
      onConfirm({
        name: sessionName,
        sourceSessionId: selectedSession
      }, true);
    }
  };

  const handleRandomPercentageChange = (e) => {
    const value = Math.max(1, Math.min(100, parseInt(e.target.value) || 0));
    setRandomPercentage(value);
  };

  if (loading) {
    return (
      <DialogOverlay>
        <DialogContent>
          <p>Loading...</p>
        </DialogContent>
      </DialogOverlay>
    );
  }

  if (error) {
    return (
      <DialogOverlay>
        <DialogContent>
          <p>{error}</p>
          <CancelButton onClick={onCancel}>Close</CancelButton>
        </DialogContent>
      </DialogOverlay>
    );
  }

  return (
    <DialogOverlay>
      <DialogContent>
        <h2>Create New Session</h2>
        <Input
          type="text"
          value={sessionName}
          onChange={(e) => setSessionName(e.target.value)}
          placeholder="Session Name"
        />

        <TabContainer>
          <TabButton
            $active={activeTab === 'cardSets'}
            onClick={() => setActiveTab('cardSets')}
          >
            Create from Card Sets
          </TabButton>
          <TabButton
            $active={activeTab === 'copy'}
            onClick={() => setActiveTab('copy')}
          >
            <FaCopy style={{ marginRight: '5px' }} />
            Copy Existing Session
          </TabButton>
        </TabContainer>

        <TabContent>
          {activeTab === 'cardSets' ? (
            <>
              <p>Select card sets to import:</p>
              {cardSets.map(cardSet => (
                <div key={cardSet.id}>
                  <input
                    type="checkbox"
                    id={`cardSet-${cardSet.id}`}
                    checked={selectedCardSets.includes(cardSet.id)}
                    onChange={() => handleCardSetToggle(cardSet.id)}
                  />
                  <label htmlFor={`cardSet-${cardSet.id}`}>{cardSet.name}</label>
                </div>
              ))}
              <RandomizeContainer>
                <input
                  type="checkbox"
                  id="randomizeOrder"
                  checked={randomizeOrder}
                  onChange={(e) => setRandomizeOrder(e.target.checked)}
                />
                <label htmlFor="randomizeOrder">
                  <RandomizeIcon />
                  Import cards in random order
                </label>
                {randomizeOrder && (
                  <>
                    <PercentageInput
                      type="number"
                      value={randomPercentage}
                      onChange={handleRandomPercentageChange}
                      min="1"
                      max="100"
                    />
                    <span>%</span>
                  </>
                )}
              </RandomizeContainer>
            </>
          ) : (
            <>
              <p>Select a session to copy:</p>
              <Select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
              >
                <option value="">Select a session...</option>
                {existingSessions.map(session => (
                  <option key={session.id} value={session.id}>
                    {session.name} ({new Date(session.created_datetime).toLocaleDateString()})
                  </option>
                ))}
              </Select>
            </>
          )}
        </TabContent>

        <Button onClick={handleConfirm}>Create Session</Button>
        <CancelButton onClick={onCancel}>Cancel</CancelButton>
      </DialogContent>
    </DialogOverlay>
  );
}

export default NewSessionDialog;
