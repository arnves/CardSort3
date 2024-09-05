import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import axios from 'axios';

function Dendrogram({ token, selectedSessions }) {
  const svgRef = useRef();
  const [dendrogramData, setDendrogramData] = useState(null);

  useEffect(() => {
    const fetchCardData = async () => {
      if (selectedSessions.length === 0) {
        setDendrogramData(null);
        return;
      }

      try {
        const cardDataPromises = selectedSessions.map(sessionId =>
          axios.get(`${process.env.REACT_APP_API_URL}/sessions/${sessionId}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        );
        const cardDataResponses = await Promise.all(cardDataPromises);
        const cardData = cardDataResponses.map(response => response.data);
        const dendrogramData = createDendrogramData(cardData);
        setDendrogramData(dendrogramData);
      } catch (error) {
        console.error('Error fetching card data:', error);
      }
    };

    fetchCardData();
  }, [token, selectedSessions]);

  const createDendrogramData = (sessions) => {
    const allCards = [...new Set(sessions.flatMap(session => 
      Object.values(session.categories).flatMap(category => 
        category.cards.map(card => card.title)
      )
    ))];

    let clusters = allCards.map(card => ({ name: card, children: [] }));

    while (clusters.length > 1) {
      let bestMerge = { score: -Infinity, i: -1, j: -1 };

      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const score = calculateMergeScore(clusters[i], clusters[j], sessions);
          if (score > bestMerge.score) {
            bestMerge = { score, i, j };
          }
        }
      }

      const newCluster = {
        name: `Cluster ${clusters.length - 1}`,
        children: [clusters[bestMerge.i], clusters[bestMerge.j]]
      };
      clusters = clusters.filter((_, index) => index !== bestMerge.i && index !== bestMerge.j);
      clusters.push(newCluster);
    }

    return clusters[0];
  };

  const calculateMergeScore = (cluster1, cluster2, sessions) => {
    const cards1 = getLeafNodes(cluster1);
    const cards2 = getLeafNodes(cluster2);

    let sameCategory = 0;
    let totalPairs = 0;

    sessions.forEach(session => {
      Object.values(session.categories).forEach(category => {
        const categoryCards = category.cards.map(card => card.title);
        cards1.forEach(card1 => {
          cards2.forEach(card2 => {
            if (categoryCards.includes(card1) && categoryCards.includes(card2)) {
              sameCategory++;
            }
            totalPairs++;
          });
        });
      });
    });

    return sameCategory / totalPairs;
  };

  const getLeafNodes = (cluster) => {
    if (!cluster.children || cluster.children.length === 0) {
      return [cluster.name];
    }
    return cluster.children.flatMap(getLeafNodes);
  };

  useEffect(() => {
    if (!dendrogramData) return;

    const width = 800;
    const height = 600;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(40,0)`);

    const cluster = d3.cluster()
      .size([height, width - 100]);

    const root = d3.hierarchy(dendrogramData);

    cluster(root);

    svg.selectAll('path')
      .data(root.descendants().slice(1))
      .enter()
      .append('path')
      .attr('d', d => `M${d.y},${d.x}C${(d.parent.y + 100)},${d.x} ${(d.parent.y + 100)},${d.parent.x} ${d.parent.y},${d.parent.x}`)
      .style('fill', 'none')
      .attr('stroke', '#ccc');

    const node = svg.selectAll('g')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('transform', d => `translate(${d.y},${d.x})`);

    node.append('circle')
      .attr('r', 4)
      .style('fill', '#fff')
      .style('stroke', 'steelblue')
      .style('stroke-width', '1.5px');

    node.append('text')
      .attr('dy', '.31em')
      .attr('x', d => d.children ? -8 : 8)
      .style('text-anchor', d => d.children ? 'end' : 'start')
      .text(d => d.data.name);

  }, [dendrogramData]);

  if (!dendrogramData) {
    return <p>Select sessions to generate the dendrogram.</p>;
  }

  return (
    <div>
      <h2>Dendrogram</h2>
      <svg ref={svgRef}></svg>
    </div>
  );
}

export default Dendrogram;