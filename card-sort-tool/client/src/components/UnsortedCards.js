import React, { useState } from 'react';
import styled from 'styled-components';
import { FaPlus } from 'react-icons/fa';
import Card from './Card';

const UnsortedCardsContainer = styled.div`
  flex: 1;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 5px;
  margin: 10px;
  background-color: ${props => props.$isDraggingOver ? '#e0e0e0' : '#f0f0f0'};
  transition: background-color 0.3s ease;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

const NewCategoryButton = styled.button`
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;

  &:hover {
    background-color: #0056b3;
  }
`;

function UnsortedCards({ cards, onDragStart, onDragOver, onDrop, onCreateCategory }) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDraggingOver(true);
    onDragOver(e);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
    onDrop(e, 'Unsorted');  // Pass 'Unsorted' as the destination category
  };

  return (
    <UnsortedCardsContainer
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      $isDraggingOver={isDraggingOver}
    >
      <Header>
        <h3>Unsorted Cards</h3>
        <NewCategoryButton onClick={() => onCreateCategory('New Category')}>
          <FaPlus style={{ marginRight: '5px' }} />
          New Category
        </NewCategoryButton>
      </Header>
      {cards.map(card => (
        <Card
          key={card.id}
          id={card.id}
          title={card.title}
          text={card.text}
          onDragStart={(e) => onDragStart(e, card.id, 'Unsorted')}
          editable={false} // Disable editing in UnsortedCards
        />
      ))}
    </UnsortedCardsContainer>
  );
}

export default UnsortedCards;