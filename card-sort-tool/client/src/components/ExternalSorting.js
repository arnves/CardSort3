import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import styled from 'styled-components';
import CardSortingArea from './CardSortingArea';

const ExternalSortingContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const PasswordPrompt = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
`;

const SubmitButtonContainer = styled.div`
  padding: 20px;
  background-color: #f0f0f0;
  border-top: 1px solid #ccc;
`;

const SubmitButton = styled.button`
  background-color: #4CAF50;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin-top: 20px;
  width: 100%;
  max-width: 300px;
  display: block;
  margin: 0 auto;

  &:hover {
    background-color: #45a049;
  }
`;

const SortingContent = styled.div`
  flex: 1;
  overflow-y: auto;
`;

function ExternalSorting() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [password, setPassword] = useState('');
  const [isPasswordRequired, setIsPasswordRequired] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSession();
  }, [id]);

  const fetchSession = async () => {
    try {
      const response = await axios.get(`/api/external-sorting/${id}`, {
        headers: { 'X-Password': password }
      });
      setSession(response.data);
      setIsLoading(false);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        setIsPasswordRequired(true);
      } else {
        console.error('Error fetching session:', error);
        navigate('/');
      }
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await fetchSession();
  };

  const handleCreateCategory = async (name) => {
    try {
      const response = await axios.post(`/api/external-sorting/${id}/categories`, 
        { name },
        { headers: { 'X-Password': password } }
      );
      setSession(prevSession => ({
        ...prevSession,
        categories: {
          ...prevSession.categories,
          [response.data.id]: { id: response.data.id, name: response.data.name, cards: [] }
        }
      }));
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  const handleRenameCategory = async (categoryId, newName) => {
    try {
      await axios.put(`/api/external-sorting/${id}/categories/${categoryId}`,
        { name: newName },
        { headers: { 'X-Password': password } }
      );
      setSession(prevSession => ({
        ...prevSession,
        categories: {
          ...prevSession.categories,
          [categoryId]: { ...prevSession.categories[categoryId], name: newName }
        }
      }));
    } catch (error) {
      console.error('Error renaming category:', error);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      await axios.delete(`/api/external-sorting/${id}/categories/${categoryId}`,
        { headers: { 'X-Password': password } }
      );
      setSession(prevSession => {
        const { [categoryId]: deletedCategory, ...remainingCategories } = prevSession.categories;
        return {
          ...prevSession,
          categories: remainingCategories,
          unsortedCards: [...prevSession.unsortedCards, ...deletedCategory.cards]
        };
      });
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const handleMoveCard = async (cardId, categoryId) => {
    try {
      await axios.put(`/api/external-sorting/${id}/cards/${cardId}`,
        { category_id: categoryId },
        { headers: { 'X-Password': password } }
      );
      setSession(prevSession => {
        const updatedSession = { ...prevSession };
        let card;

        // Find and remove the card from its current location
        if (updatedSession.unsortedCards.some(c => c.id.toString() === cardId)) {
          card = updatedSession.unsortedCards.find(c => c.id.toString() === cardId);
          updatedSession.unsortedCards = updatedSession.unsortedCards.filter(c => c.id.toString() !== cardId);
        } else {
          Object.values(updatedSession.categories).forEach(category => {
            if (category.cards && category.cards.some(c => c.id.toString() === cardId)) {
              card = category.cards.find(c => c.id.toString() === cardId);
              category.cards = category.cards.filter(c => c.id.toString() !== cardId);
            }
          });
        }

        if (!card) {
          console.error('Card not found:', cardId);
          return updatedSession;
        }

        // Add the card to its new location
        if (categoryId === null) {
          updatedSession.unsortedCards.push(card);
        } else {
          if (!updatedSession.categories[categoryId]) {
            updatedSession.categories[categoryId] = { id: categoryId, name: 'Unknown Category', cards: [] };
          }
          if (!updatedSession.categories[categoryId].cards) {
            updatedSession.categories[categoryId].cards = [];
          }
          updatedSession.categories[categoryId].cards.push(card);
        }

        return updatedSession;
      });
    } catch (error) {
      console.error('Error moving card:', error);
    }
  };

  const handleSubmit = async () => {
    if (window.confirm('Are you sure you want to submit this sorting session?')) {
      try {
        await axios.post(`/api/external-sorting/${id}/submit`, 
          {},
          { headers: { 'X-Password': password } }
        );
        alert('Sorting session submitted successfully!');
        navigate('/');
      } catch (error) {
        console.error('Error submitting session:', error);
        alert('Error submitting session. Please try again.');
      }
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isPasswordRequired) {
    return (
      <PasswordPrompt>
        <h2>Password Required</h2>
        <form onSubmit={handlePasswordSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
          />
          <button type="submit">Submit</button>
        </form>
      </PasswordPrompt>
    );
  }

  if (!session) {
    return <div>Session not found or expired.</div>;
  }

  return (
    <ExternalSortingContainer>
      <SortingContent>
        <h1>External Card Sorting Session</h1>
        <CardSortingArea
          session={session}
          apiUrl={`/api/external-sorting/${id}`}
          authHeader={{ 'X-Password': password }}
          onCreateCategory={handleCreateCategory}
          onRenameCategory={handleRenameCategory}
          onDeleteCategory={handleDeleteCategory}
          onMoveCard={handleMoveCard}
        />
      </SortingContent>
      <SubmitButtonContainer>
        <SubmitButton onClick={handleSubmit}>Submit Sorting Session</SubmitButton>
      </SubmitButtonContainer>
    </ExternalSortingContainer>
  );
}

export default ExternalSorting;