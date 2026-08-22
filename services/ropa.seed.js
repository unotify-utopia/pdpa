export const seedRopaMasterData = async (dbPool) => {
  try {
    const { rows: existingBases } = await dbPool.query('SELECT count(*) as count FROM ropa_legal_bases');
    if (parseInt(existingBases[0].count) === 0) {
      console.log('🌱 Seeding RoPA Legal Bases...');
      await dbPool.query(`
        INSERT INTO ropa_legal_bases (id, name, description) VALUES 
        ('lb_consent', 'Consent', 'ความยินยอม'),
        ('lb_contract', 'Contract', 'ฐานสัญญา'),
        ('lb_legal_obligation', 'Legal Obligation', 'ฐานหน้าที่ตามกฎหมาย'),
        ('lb_vital_interest', 'Vital Interest', 'ฐานการป้องกันอันตรายต่อชีวิต'),
        ('lb_public_task', 'Public Task', 'ฐานภารกิจของรัฐ'),
        ('lb_legitimate_interest', 'Legitimate Interest', 'ฐานประโยชน์ชอบด้วยกฎหมาย'),
        ('lb_historical', 'Historical/Research', 'ฐานจดหมายเหตุ/วิจัย/สถิติ')
      `);
    }

    const { rows: existingSubjects } = await dbPool.query('SELECT count(*) as count FROM ropa_data_subject_types');
    if (parseInt(existingSubjects[0].count) === 0) {
      console.log('🌱 Seeding RoPA Data Subject Types...');
      await dbPool.query(`
        INSERT INTO ropa_data_subject_types (id, name, description) VALUES 
        ('subj_employee', 'Employee', 'พนักงาน'),
        ('subj_customer', 'Customer', 'ลูกค้า'),
        ('subj_candidate', 'Candidate', 'ผู้สมัครงาน'),
        ('subj_vendor', 'Vendor/Partner', 'คู่ค้า/ผู้รับจ้าง')
      `);
    }

    const { rows: existingCategories } = await dbPool.query('SELECT count(*) as count FROM ropa_data_categories');
    if (parseInt(existingCategories[0].count) === 0) {
      console.log('🌱 Seeding RoPA Data Categories...');
      await dbPool.query(`
        INSERT INTO ropa_data_categories (id, name, is_sensitive_data, description) VALUES 
        ('cat_name', 'Name-Surname', false, 'ชื่อ-นามสกุล'),
        ('cat_email', 'Email', false, 'อีเมล'),
        ('cat_phone', 'Phone Number', false, 'เบอร์โทรศัพท์'),
        ('cat_address', 'Address', false, 'ที่อยู่'),
        ('cat_health', 'Health Record', true, 'ประวัติสุขภาพ'),
        ('cat_criminal', 'Criminal Record', true, 'ประวัติอาชญากรรม'),
        ('cat_religion', 'Religion', true, 'ศาสนา'),
        ('cat_biometric', 'Biometric Data', true, 'ข้อมูลชีวมาตร (เช่น ลายนิ้วมือ, สแกนใบหน้า)')
      `);
    }

  } catch (error) {
    console.error('❌ Error seeding RoPA master data:', error);
  }
};
