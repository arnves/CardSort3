import React, { useState } from 'react';
import styled from 'styled-components';
import { FaPencilAlt, FaTrash } from 'react-icons/fa';

const CardContainer = styled.div`
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px;
  margin-bottom: 8px;
  background-color: white;
  cursor: move;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const CardTitle = styled.h4`
  margin: 0;
  flex-grow: 1;
`;

const IconContainer = styled.div`
  display: flex;
  gap: 8px;
`;

const CardText = styled.p`
  margin: 0;
  max-height: ${props => props.expanded ? 'none' : '0'};
  overflow: hidden;
  transition: max-height 0.3s ease;
`;

const EditInput = styled.input`
  width: 100%;
  margin-bottom: 8px;
`;

const EditTextarea = styled.textarea`
  width: 100%;
  margin-bottom: 8px;
`;

const ConfirmDialog = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
`;

const ConfirmDialogContent = styled.div`
  background-color: white;
  padding: 20px;
  border-radius: 4px;
  text-align: center;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 10px;
`;

function Card({ id, title, text, onDragStart, onEdit, onDelete, editable, cardSetName }) {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editText, setEditText] = useState(text);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleSave = () => {
    onEdit(id, editTitle, editText);
    setIsEditing(false);
  };

  const handleDelete = () => {
    setShowConfirmDialog(true);
  };

  const confirmDelete = () => {
    onDelete(id);
    setShowConfirmDialog(false);
  };

  return (
    <>
      <CardContainer 
        draggable={!!onDragStart}
        onDragStart={onDragStart}
        onMouseEnter={() => setExpanded(true)} 
        onMouseLeave={() => setExpanded(false)}
      >
        {isEditing ? (
          <>
            <EditInput value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            <EditTextarea value={editText} onChange={(e) => setEditText(e.target.value)} />
            <button onClick={handleSave}>Save</button>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle>{title || 'Untitled'}</CardTitle>
              {editable && (
                <IconContainer>
                  <FaPencilAlt onClick={() => setIsEditing(true)} style={{ cursor: 'pointer' }} />
                  <FaTrash onClick={handleDelete} style={{ cursor: 'pointer' }} />
                </IconContainer>
              )}
            </CardHeader>
            <CardText expanded={expanded}>{text || 'No content'}</CardText>
          </>
        )}
      </CardContainer>
      {showConfirmDialog && (
        <ConfirmDialog>
          <ConfirmDialogContent>
            <p>Are you sure you want to delete the card "{title}" from the card set "{cardSetName}"?</p>
            <ButtonContainer>
              <button onClick={confirmDelete}>Delete</button>
              <button onClick={() => setShowConfirmDialog(false)}>Cancel</button>
            </ButtonContainer>
          </ConfirmDialogContent>
        </ConfirmDialog>
      )}
    </>
  );
}

export default Card;