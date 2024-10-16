import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { FaRandom } from 'react-icons/fa';

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

function generateSessionName() {
  const base = "Session ";
  const randomPart = Math.random().toString(36).substring(2, 9).toUpperCase();
  return base + randomPart;
}

function NewSessionDialog({ token, selectedCardSets, setSelectedCardSets, onConfirm, onCancel }) {
  const [sessionName, setSessionName] = useState(generateSessionName());
  const [cardSets, setCardSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [randomizeOrder, setRandomizeOrder] = useState(false);
  const [randomPercentage, setRandomPercentage] = useState(100);

  useEffect(() => {
    const fetchCardSets = async () => {
      try {
        const response = await axios.get(`/api/card-sets`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        });
        setCardSets(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching card sets:', error);
        setError('Error fetching card sets. Please try again.');
        setLoading(false);
      }
    };

    fetchCardSets();
  }, [token]);

  const handleCardSetToggle = (cardSetId) => {
    if (selectedCardSets.includes(cardSetId)) {
      setSelectedCardSets(selectedCardSets.filter(id => id !== cardSetId));
    } else {
      setSelectedCardSets([...selectedCardSets, cardSetId]);
    }
  };

  const handleConfirm = () => {
    onConfirm(sessionName, randomizeOrder, randomPercentage);
  };

  const handleRandomPercentageChange = (e) => {
    const value = Math.max(1, Math.min(100, parseInt(e.target.value) || 0));
    setRandomPercentage(value);
  };

  if (loading) {
    return (
      <DialogOverlay>
        <DialogContent>
          <p>Loading card sets...</p>
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
        <Button onClick={handleConfirm}>Create Session</Button>
        <CancelButton onClick={onCancel}>Cancel</CancelButton>
      </DialogContent>
    </DialogOverlay>
  );
}

export default NewSessionDialog;
