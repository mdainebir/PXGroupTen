CREATE TABLE camera
(

);

CREATE TABLE timelapses
(
  timelapseID    INT unsigned NOT NULL AUTO_INCREMENT,
  cameraID       INT  NOT NULL,    
  startDate      DATE NOT NULL,            
  startTime      TIME NOT NULL,              
  endDate        DATE NOT NULL,
  endTime        TIME NOT NULL,
  setExposure    TINYINT(1) NOT NULL,                       
  PRIMARY KEY    (timelapseID) 
);

CREATE TABLE photos
(
  photoId         INT unsigned NOT NULL AUTO_INCREMENT,
  fileName        VARCHAR(50) NOT NULL,    
  image           BLOB NOT NULL,            
  dateTaken       DATE NOT NULL,              
  timeTaken       TIME NOT NULL,                       
  PRIMARY KEY     (photoId)                                
);

CREATE TABLE videos
(
  photoId         INT unsigned NOT NULL AUTO_INCREMENT,
  fileName        VARCHAR(50) NOT NULL,    
  image           BLOB NOT NULL,            
  dateTaken       DATE NOT NULL,              
  timeTaken       TIME NOT NULL,                       
  PRIMARY KEY     (photoId)                                
);
