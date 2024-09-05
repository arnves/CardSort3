import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { FaTrash, FaPencilAlt } from 'react-icons/fa';
import Card from './Card';

const CategoryContainer = styled.div`
  background-color: ${props => props.isDraggingOver ? '#e0e0e0' : '#f0f0f0'};
  border-radius: 4px;
  padding: 8px;
  margin: 8px;
  transition: background-color 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-width: 300px; /* Adjusted to ensure enough space for a card */
  max-width: 300px;
  min-height: 100px; /* Minimum height for one card */
  box-sizing: border-box; /* Ensure padding is included in the width and height */
`;

const CategoryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const CategoryTitleInput = styled.input`
  margin: 0;
  border: none;
  background: none;
  font-size: 1.25em;
  font-weight: bold;
  width: 100%;
  &:focus {
    outline: none;
  }
`;

const CategoryTitleSpan = styled.span`
  font-size: 1.25em;
  font-weight: bold;
`;

const CardListContainer = styled.div`
  background-color: #f5f5f5; /* Slightly lighter gray */
  border-radius: 4px;
  padding: 8px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  box-sizing: border-box; /* Ensure padding is included in the width */
`;

const CardList = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-height: 100px; /* Minimum height for one card */
`;

const CategoryDropZone = styled.div`
  // ... existing styles ...
  background-color: ${props => props.$isDraggingOver ? '#e0e0e0' : 'transparent'};
  // ... other styles ...
`;

function Category({ categoryId, name, cards = [], onDelete, onDragStart, onDragOver, onDrop, onRename, isNewCategory, apiUrl, authHeader }) {
  const [isEditing, setIsEditing] = useState(isNewCategory);
  const [title, setTitle] = useState(name);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
  };

  const handleTitleBlur = async () => {
    setIsEditing(false);
    if (title !== name && onRename) {  // Add a check to ensure onRename exists
      console.log(`Calling onRename with categoryId: ${categoryId}, newName: ${title}`);
      await onRename(categoryId, title);
    }
  };

  const handleTitleClick = () => {
    setIsEditing(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleTitleBlur();
    }
  };

  const handleDragEnter = () => {
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDropWrapper = (e) => {
    setIsDraggingOver(false);
    onDrop(e, categoryId);
  };

  return (
    <CategoryContainer
      onDragOver={(e) => onDragOver(e)}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDropWrapper}
      isDraggingOver={isDraggingOver}
    >
      <CategoryHeader>
        {isEditing ? (
          <CategoryTitleInput
            ref={inputRef}
            value={title}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <CategoryTitleSpan>{title}</CategoryTitleSpan>
            <FaPencilAlt onClick={handleTitleClick} style={{ marginLeft: '8px', cursor: 'pointer' }} />
          </div>
        )}
        <FaTrash onClick={onDelete} style={{ cursor: 'pointer' }} />
      </CategoryHeader>
      <CardListContainer>
        <CardList>
          {Array.isArray(cards) && cards.map((card) => (
            <Card
              key={card.id}
              id={card.id}
              title={card.title}
              text={card.text}
              onDragStart={(e) => onDragStart(e, card.id, categoryId)}
            />
          ))}
        </CardList>
      </CardListContainer>
      <CategoryDropZone
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={(e) => {
          setIsDraggingOver(false);
          onDrop(e, categoryId);
        }}
        $isDraggingOver={isDraggingOver}
      >
        {/* ... card elements ... */}
      </CategoryDropZone>
    </CategoryContainer>
  );
}

export default Category;