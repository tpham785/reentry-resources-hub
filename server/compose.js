const fs = require('fs');

function vInterpolate(input, config) {
  const commonJ = config.common_jurisdiction;
  const localJ = config.local_jurisdiction;
  const baseUrl = config.base_url;
  return input.replace(/{{common_jurisdiction}}/g, commonJ)
  .replace(/{{local_jurisdiction}}/g, localJ)
  .replace(/{{base_url}}/g, baseUrl);
}

function loadConfig(path, inputConfig, callback) {
  try {
    const configArray = JSON.parse(fs.readFileSync(path));
    const config = {};

    configArray.pairs.forEach((item) => {
      config[item.name] = item.value;
    });

    callback(null, Object.assign({}, inputConfig, config));
  } catch (e) {
    callback(e);
  }
}

function loadJsonFile(path, callback) {
  try {
    callback(null, JSON.parse(fs.readFileSync(path)));
  } catch (e) {
    callback(e);
  }
}

// Load and merge all the configurations
function loadConfigurations(jurisdiction, topic, contentDir, callback) {
  const file1 = `${contentDir}/config.json`; // site configuration
  loadConfig(file1, {}, (lc1Err, config1) => {
    if (lc1Err) callback(lc1Err, null);
    else {
      const file2 = `${contentDir}/topics/${topic}/config.json`; // site topic configuration
      loadConfig(file2, config1, (lc2Err, config2) => {
        if (lc2Err) callback(lc2Err, null);
        else {
          const file3 = `${contentDir}/jurisdictions/${jurisdiction}/config.json`; // local configuration
          loadConfig(file3, config2, (lc3Err, config3) => {
            if (lc3Err) callback(lc3Err, null);
            else {
              const file4 = `${contentDir}/jurisdictions/${jurisdiction}/${topic}/config.json`; // local topic configuration
              if (fs.existsSync(file4)) {
                loadConfig(file4, config3, (lc4Err, config4) => {
                  if (lc4Err) callback(lc4Err, null);
                  else callback(null, config4);
                });
              } else {
                callback(null, config3);
              }
            }
          });
        }
      });
    }
  });
}

function loadCommonTopic(topicName, config, contentDir, callback) {
  const topic = {};
  const file1 = `${contentDir}/topics/${topicName}/description.json`;
  loadJsonFile(file1, (err1, content) => {
    if (err1) callback(err1, null);
    else {
      topic.description = vInterpolate(content.description.join('\n'), config.config);
      const file2 = `${contentDir}/topics/${topicName}/resources_common.json`;
      loadJsonFile(file2, (err2, common) => {
        if (err2) callback(err2, null);
        else {
          topic.resources = common.resources;
          const file3 = `${contentDir}/topics/${topicName}/resources_local.json`;
          loadJsonFile(file3, (err3, local) => {
            if (err3) callback(err3, null);
            else {
              topic.local = local;
              callback(null, topic);
            }
          });
        }
      });
    }
  });
}

function loadJurisdictionTopic(jurisdiction, topicName, config, contentDir, callback) {
  const topic = {};
  const file1 = `${contentDir}/jurisdictions/${jurisdiction}/${topicName}/description.json`;
  if (!fs.existsSync(file1)) {
    topic.description = '';
    const file2 = `${contentDir}/jurisdictions/${jurisdiction}/${topicName}/resources_local.json`;
    if (!fs.existsSync(file2)) {
      topic.resources = [];
      callback(null, topic);
    } else {
      loadJsonFile(file2, (err2, local) => {
        if (err2) callback(err2, null);
        else {
          topic.resources = local.resources;
          callback(null, topic);
        }
      });
    }
  } else {
    loadJsonFile(file1, (err1, content) => {
      if (err1) callback(err1, null);
      else {
        topic.description = vInterpolate(content.description.join('\n'), config.config);
        const file2 = `${contentDir}/jurisdictions/${jurisdiction}/${topicName}/resources_local.json`;
        if (!fs.existsSync(file2)) {
          topic.resources = [];
          callback(null, topic);
        } else {
          loadJsonFile(file2, (err2, local) => {
            if (err2) callback(err2, null);
            else {
              topic.resources = local.resources;
              callback(null, topic);
            }
          });
        }
      }
    });
  }
}

function loadTopic(jurisdiction, topicName, config, contentDir, callback) {
  const topic = {
    config,
    common: {},
    jurisdiction: {},
  };
  loadCommonTopic(topicName, topic, contentDir, (err1, commonTopic) => {
    if (err1) callback(err1, null);
    else {
      topic.common = commonTopic;
      loadJurisdictionTopic(jurisdiction, topicName, topic, contentDir, (err2, jurisdictionTopic) => {
        if (err2) {
          callback(err2, null);
        } else {
          topic.jurisdiction = jurisdictionTopic;
          callback(null, topic);
        }
      });
    }
  });
}

function compose(jurisdiction, topic1, contentDir, callback) {
  loadConfigurations(jurisdiction, topic1, contentDir, (err1, config) => {
    if (err1) callback(err1);
    else {
      loadTopic(jurisdiction, topic1, config, contentDir, (err2, topic2) => {
        if (err2) callback(err2);
        else callback(topic2);
      });
    }
  });
}

function mainCompose(contentDir, callback) {
  const commonConfigFile = `${contentDir}/config.json`;
  const mainConfigFile = `${contentDir}/topics/main/config.json`; // main configuration
  const mainDescFile = `${contentDir}/topics/main/description.json`;
  const main = {
    config: {},
    common: {},
  };
  loadConfig(commonConfigFile, {}, (lc1Err, commonConfigRes) => {
    if (lc1Err) callback(lc1Err, null);
    else {
      loadConfig(mainConfigFile, commonConfigRes, (lc2Err, mainConfigRes) => {
        if (lc2Err) callback(lc2Err, null);
        else {
          main.config = mainConfigRes;
          loadJsonFile(mainDescFile, (lc3Err, mainDescRes) => {
            if (lc3Err) callback(lc3Err, null);
            else {
              main.common = mainDescRes;
              callback(main);
            }
          });
        }
      });
    }
  });
}

module.exports = { compose, mainCompose };

