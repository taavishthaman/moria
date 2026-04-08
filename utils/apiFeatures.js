const getSubstringBetween = (str, startChar, endChar) => {
  const startIndex = str.indexOf(startChar);
  if (startIndex == -1) {
    return { operator: null, property: null };
  }

  const endIndex = str.indexOf(endChar, startIndex + 1);

  if (endIndex == -1) {
    return { operator: null, property: null };
  }

  return {
    operator: str.substring(startIndex + 1, endIndex),
    property: str.substring(0, startIndex),
  };
};

class APIFeatures {
  constructor(query, queryString, newQueryObj) {
    this.query = query;
    this.queryString = queryString;
    this.newQueryObj = newQueryObj;
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ["page", "sort", "limit", "fields"];

    excludedFields.forEach((el) => delete queryObj[el]);

    this.newQueryObj = {
      where: {},
    };

    Object.keys(queryObj).forEach((el) => {
      const { operator, property } = getSubstringBetween(el, "[", "]");

      if (operator !== null && property !== null) {
        this.newQueryObj["where"][property] = {
          [operator]: queryObj[el] * 1,
        };
      } else {
        this.newQueryObj["where"][el] = queryObj[el];
      }
    });

    this.query = this.query.findMany(this.newQueryObj);

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(",");

      sortBy.forEach((el) => {
        if (el[0] === "-") {
          this.newQueryObj["orderBy"] = {
            [el.substring(1)]: "desc",
          };
        } else {
          this.newQueryObj["orderBy"] = {
            [el]: "asc",
          };
        }
      });
    } else {
      //TODO: Generic Case!
      this.newQueryObj["orderBy"] = {
        feedback_id: "asc",
      };
    }

    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(",");
      this.newQueryObj["select"] = {};
      fields.forEach((el) => {
        this.newQueryObj["select"][el] = true;
      });
    }

    return this;
  }

  paginate() {
    const page = this.queryString.page;
    const limit = this.queryString.limit;

    if (page && limit) {
      const skip = (page - 1) * limit;
      this.newQueryObj["take"] = limit * 1;
      this.newQueryObj["skip"] = skip * 1;
    }

    return this;
  }
}

module.exports = APIFeatures;
