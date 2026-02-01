import React from 'react';

const ContentList = ({ items, onItemSelect, loading }) => {
  if (loading) {
    return <div className="loading">Loading content...</div>;
  }

  if (!items || items.length === 0) {
    return <div className="empty">No content available</div>;
  }

  return (
    <div className="content-grid">
      {items.map((item) => (
        <div 
          key={item.id} 
          className="content-card"
          onClick={() => onItemSelect(item)}
        >
          {item.poster && (
            <img 
              src={item.poster} 
              alt={item.name}
              className="content-poster"
            />
          )}
          <div className="content-info">
            <h3 className="content-title">{item.name}</h3>
            {item.type && (
              <span className="content-type">{item.type}</span>
            )}
            {item.year && (
              <span className="content-year">{item.year}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ContentList;