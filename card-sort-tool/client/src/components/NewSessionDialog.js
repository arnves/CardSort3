import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';

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
    onConfirm(sessionName);
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
        <Button onClick={handleConfirm}>Create Session</Button>
        <CancelButton onClick={onCancel}>Cancel</CancelButton>
      </DialogContent>
    </DialogOverlay>
  );
}

export default NewSessionDialog;