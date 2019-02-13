var fs = require('fs');

const args = process.argv;
let data_type = args[2]
let translate_data = args[3]

if(!translate_data) throw new Error("Please specify a translation file");

create_upload_file(data_type, translate_data);

function create_upload_file(datatype_string, translate_data) {
	
  let input_filename = "./5e-SRD-" + datatype_string + ".json"
  console.log(input_filename);
  
  // read translate sync
  let translate = JSON.parse(fs.readFileSync(translate_data));
  //console.log('translate', translate);

	let index_and_urlify = (err,data) => {
		
		data = JSON.parse(data);

		let keys = Object.keys(data);

    let main = {};

    let translate_key = Object.getOwnPropertyNames(translate)[0];
    let translate_item_keys = Object.getOwnPropertyNames(translate[translate_key]);

    let records = main[translate_key] = [];

		// number the indexes and change the URLs
		for(let i = 0; i < data.length; i++) {
			data[i].index = i + 1;
			if (data_type !== "levels") {
				data[i].url = "https://5eapi.bitwisemobile.com/v1/" + datatype_string + "/"+ (i + 1).toString();
      }

      // build record
      let record = {};

      record.PutRequest = {};
      record.PutRequest.Item = {};

      records.push(record);

      let record_item = record.PutRequest.Item;

      let processItem = function(item, keys, translation_map, ri) {
      
        for(let j = 0; j < keys.length; j++) {

          let item_key = keys[j];

          let translate_item = translation_map[item_key];
          let curValue = item[item_key];

          //console.log('translate_item', translate_item);
          //console.log('item_key', item_key);

          //console.log('curValue', curValue);
          //console.log('itemKey', item_key);
          if(!curValue) continue;

          ri[item_key] = {};

          
          if(typeof(translate_item) === 'object') {

            if(translate_item.constructor === Array) {
              console.log('ltype');
              // we have a 'L' type
              let lstack = ri[item_key].L = [];
              let new_keys = Object.getOwnPropertyNames(translate_item[0]);

              console.log('new_keys', new_keys);
              console.log('translate_item[0]', translate_item[0]);
              console.log('curValue', curValue);

              for(let n = 0; n < curValue.length; n++) {
                let newItem = {};
                lstack.push(newItem);

                newItem.M = {};
                
                processItem(curValue[n], new_keys, translate_item[0], newItem.M);
              }

            }
            else {
              let new_keys = Object.getOwnPropertyNames(translate_item);

              ri[item_key].M = {}
              processItem(curValue, new_keys, translate_item, ri[item_key].M);
            }

          } else {

            if(curValue.constructor === Array) {
              for(let k = 0; k < curValue.length; k++) {
                curValue[k] = curValue[k].replace(/[^ -~]+/g, "");
              }
            } else if(typeof(curValue) === 'string') {
              curValue = curValue.replace(/[^ -~]+/g, "");
            }

            ri[item_key][translate_item] = translate_item === "N" ? curValue.toString() : curValue;
          }
        }
      };

      processItem(data[i], translate_item_keys, translate[translate_key], record_item);
		}

		let output_filename = "./upload-5e-SRD-" + datatype_string + ".json";

		fs.writeFile(output_filename, JSON.stringify(main, null, 2), (err) => {
			if (err) throw err;
			console.log('Success');
			console.log("aws dynamodb batch-write-item --request-items file://upload-5e-SRD-" + datatype_string + ".json")
		});

	}

	fs.readFile(input_filename, 'utf8', (err,data) => {
		return index_and_urlify(err,data);
	})

}
function create_all_upload_files() {
	for (let i = 0; i < all_data_types.length; i++) {
		create_upload_file(all_data_types[i]);
	}
}



// mongoimport -h ds133158.mlab.com:33158 -d 5e-srd-api -c classfeatures -u admin -p password --file upload-5e-SRD-classfeatures.json --jsonArray
