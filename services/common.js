const { Types } = require("mongoose");

const create = async (Model, profile) => {
  try {
    const data = await new Model(profile).save();
    return data;
    // const data = Model.create(profile)
    // return data
  } catch (err) {
    console.log(err)
    return false;
  }
};

const getById = async (Model, id) => {
  try {
    const data = await Model.findById(id);
    return data;
  } catch (error) {
    return false;
  }
};

const findAll = async (Model, content) => {
  try {
    const data = await Model.find(content);
    return data;
  } catch (error) {
    return false;
  }
};



const removeById = async (Model, id) => {
  try {
    const data = await Model.findByIdAndRemove(id);
    return data;
  } catch (error) {
    return false;
  }
};

const updateById = async (Model, id, content) => {
  try {
    const data = await Model.findByIdAndUpdate(
      id,
      { $set: content },
      { new: true }
    );
    return data;
  } catch (error) {
    return false;
  }
};

const insertManyData = async (Model, content) => {
  try {
    const data = Model.insertMany(content);
    return data;
  } catch (err) {
    return false;
  }
};

const deleteField = async (Model, condition, content) => {
  try {
    const data = await Model.updateOne(condition, { $unset: content });
    return data;
  } catch (err) {
    return false;
  }
}

const deleteByField = async (Model, content) => {
  try {
    const data = await Model.findOneAndRemove(content);
    return data;
  } catch (err) {
    return false;
  }
};

const findObject = async (Model, content) => {
  try {
    const data = await Model.findOne(content).sort({ createdAt: -1 });
    return data;
  } catch (err) {
    return false;
  }
};

const push = async (Model, condition, content) => {
  try {
    const data = Model.updateOne(condition, { $push: content });
    return data;
  } catch (err) {
    return false;
  }
};

const getByCondition = async (Model, condition) => {
  try {
    const data = await Model.findOne(condition).lean();
    return data;
  } catch (error) {
    return false;
  }
};

const pullObject = async (Model, condition, content) => {
  try {
    const data = Model.findOneAndUpdate(
      condition,
      { $pull: content },
      { multi: true }
    );
    return data;
  } catch (err) {
    return false;
  }
};

const updateByCondition = async (Model, condition, content) => {
  try {
    const data = await Model.updateOne(
      condition,
      { $set: content },
      { new: true }
    );
    return data;
  } catch (err) {
    console.log("🚀 ~ file: common.js:122 ~ updateByCondition ~ err:", err)
    return false;
  }
};

const updateManyByCondition = async (Model, condition, content) => {
  try {
    const data = await Model.updateMany(condition, { $set: content });
    return data;
  } catch (err) {
    return false;
  }
};

const count = async (Model, condition) => {
  try {
    const data = await Model.countDocuments(condition).lean();
    return data || 0;
  } catch (error) {
    console.log(error)
    return false;
  }
};

const getMasterData = async (Model, condition, sortCondition, offset, limit, isExport) => {
  try {
      const facetObject = {
          count: [{ $count: 'total' }],
          data: [
              { $sort: sortCondition },
          ]
      };
      if (!isExport) {
          facetObject.data.push({ $skip: offset });
          facetObject.data.push({ $limit: limit })
      }
      const data = await Model.aggregate([
          { $match: condition },
          {
              $facet: facetObject
          },
          {
              $addFields: {
                  count: {
                      $cond: {
                          if: { $eq: ['$count', []] },
                          then: 0,
                          else: {
                              $cond: {
                                  if: { $eq: ['$data', []] },
                                  then: 0,
                                  else: { $arrayElemAt: ['$count.total', 0] }
                              }
                          }
                      }
                  }
              }
          }
      ]);
      return data[0];
  } catch (err) {
      return false;
  }
};


module.exports = {
  create,
  getById,
  findAll,
  removeById,
  updateById,
  push,
  insertManyData,
  deleteByField,
  findObject,
  getByCondition,
  pullObject,
  updateByCondition,
  count,
  updateManyByCondition,
  getMasterData,
  deleteField
};
