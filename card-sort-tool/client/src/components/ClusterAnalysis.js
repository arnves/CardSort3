import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { ForceGraph2D } from 'react-force-graph';
import * as d3 from 'd3';

const ClusterContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const SliderContainer = styled.div`
  margin-bottom: 20px;
`;

const GraphContainer = styled.div`
  flex: 1;
  border: 1px solid #ccc;
`;

function ClusterAnalysis({ token, selectedSessions }) {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [threshold, setThreshold] = useState(50);
  const graphRef = useRef();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sessionsData = await Promise.all(
          selectedSessions.map(sessionId =>
            axios.get(`${process.env.REACT_APP_API_URL}/sessions/${sessionId}`, {
              headers: { Authorization: `Bearer ${token}` }
            })
          )
        );

        const nodes = new Map();
        const edges = new Map();
        const totalSessions = sessionsData.length;

        sessionsData.forEach(({ data: session }) => {
          const sessionEdges = new Set();
          Object.values(session.categories).forEach(category => {
            category.cards.forEach((card, i) => {
              if (!nodes.has(card.title)) {
                nodes.set(card.title, { 
                  id: card.title, 
                  group: 1, 
                  categories: new Set([category.name])
                });
              } else {
                nodes.get(card.title).categories.add(category.name);
              }
              for (let j = i + 1; j < category.cards.length; j++) {
                const otherCard = category.cards[j];
                const edgeId = [card.title, otherCard.title].sort().join('_');
                sessionEdges.add(edgeId);
              }
            });
          });
          sessionEdges.forEach(edgeId => {
            if (!edges.has(edgeId)) {
              edges.set(edgeId, { source: edgeId.split('_')[0], target: edgeId.split('_')[1], value: 1 });
            } else {
              edges.get(edgeId).value += 1;
            }
          });
        });

        const normalizedEdges = Array.from(edges.values()).map(edge => ({
          ...edge,
          value: edge.value / totalSessions
        }));

        const nodesWithCategories = Array.from(nodes.values()).map(node => ({
          ...node,
          categories: Array.from(node.categories)
        }));

        setGraphData({
          nodes: nodesWithCategories,
          links: normalizedEdges
        });
      } catch (error) {
        console.error('Error fetching session data:', error);
      }
    };

    if (selectedSessions.length > 0) {
      fetchData();
    } else {
      setGraphData({ nodes: [], links: [] });
    }
  }, [selectedSessions, token]);

  const filteredLinks = graphData.links.filter(link => link.value >= threshold / 100);

  useEffect(() => {
    if (graphRef.current) {
      const fg = graphRef.current;
      fg.d3Force('link').distance(100).strength(0.1);
      fg.d3Force('charge').strength(-300);
      fg.d3Force('center', d3.forceCenter());
      fg.d3Force('collide', d3.forceCollide(30));
      
      // Reheat the simulation and let it run for a while
      fg.d3ReheatSimulation();
      
      // Zoom to fit after a short delay to ensure the graph has settled
      setTimeout(() => {
        fg.zoomToFit(400);
      }, 500);
    }
  }, [graphData, filteredLinks, threshold]);

  const handleThresholdChange = (e) => {
    setThreshold(parseInt(e.target.value));
  };

  return (
    <ClusterContainer>
      <SliderContainer>
        <label htmlFor="threshold">Agreement Threshold: {threshold}%</label>
        <input
          type="range"
          id="threshold"
          min="0"
          max="100"
          value={threshold}
          onChange={handleThresholdChange}
        />
      </SliderContainer>
      <GraphContainer>
        <ForceGraph2D
          ref={graphRef}
          graphData={{ nodes: graphData.nodes, links: filteredLinks }}
          nodeLabel={node => `${node.id}\nCategories: ${node.categories.join(', ')}`}
          linkLabel={link => `${(link.value * 100).toFixed(2)}% agreement`}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const label = node.id;
            const fontSize = 14/globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            const textWidth = ctx.measureText(label).width;
            const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

            // Draw node circle
            ctx.beginPath();
            ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = node.color || '#1f77b4';
            ctx.fill();

            // Draw label background
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(node.x + 6, node.y - bckgDimensions[1] / 2, ...bckgDimensions);

            // Draw label text
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'black';
            ctx.fillText(label, node.x + 8, node.y);

            // Draw categories
            const categoryText = node.categories.join(', ');
            ctx.font = `${fontSize * 0.8}px Sans-Serif`;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillText(categoryText, node.x + 8, node.y + fontSize);
          }}
          nodeCanvasObjectMode={() => 'replace'}
          linkWidth={link => Math.sqrt(link.value) * 5}
          linkColor={() => '#999'}
          width={800}
          height={600}
        />
      </GraphContainer>
    </ClusterContainer>
  );
}

export default ClusterAnalysis;